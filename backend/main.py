"""
Insurance Underwriting API Backend
FastAPI server with Azure AI integration for insurance underwriting analysis
Enhanced with streaming responses and real-time status updates
"""

import os
import json
import time
import asyncio
import uuid
import re
from typing import Any, List, Dict, Optional
from datetime import datetime
from pathlib import Path
from urllib import request as urllib_request
from urllib import error as urllib_error

from fastapi import FastAPI, HTTPException, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ValidationError

# Storage imports
from storage import (
    storage,
    Conversation,
    ConversationMessage,
    SavedScenario,
    ScenarioShareRecord,
)


# Fabric Data Agent integration (optional, graceful fallback)
try:
    from fabric_service import fabric_client, FABRIC_AVAILABLE, build_fabric_enriched_prompt
except ImportError:
    FABRIC_AVAILABLE = False
    fabric_client = None
    def build_fabric_enriched_prompt(*a, **kw): return ""

# Azure AI Agents imports
from azure.identity import DefaultAzureCredential, AzureCliCredential
from azure.ai.agents import AgentsClient
from azure.ai.agents.models import (
  AgentEventHandler,
  FunctionTool,
  ListSortOrder,
  McpTool,
  MCPToolResource,
  MessageDeltaChunk,
  RequiredFunctionToolCall,
  RunStep,
  RunStepDeltaChunk,
  SubmitToolOutputsAction,
  ThreadMessage,
  ThreadRun,
  ToolOutput,
  ToolResources,
  CodeInterpreterTool
)

# Azure AI Evaluation imports - handle optional dependency
try:
    from azure.ai.evaluation import (
      AIAgentConverter,
      ToolCallAccuracyEvaluator,
      AzureOpenAIModelConfiguration,
      IntentResolutionEvaluator,
      TaskAdherenceEvaluator,
      evaluate
    )
    EVALUATIONS_AVAILABLE = True
except ImportError:
    print("Azure AI Evaluation not available - using mock evaluations")
    EVALUATIONS_AVAILABLE = False
    # Create mock classes for type hints
    class MockEvaluator:
        def __init__(self, **kwargs): pass
        def __call__(self, **kwargs): return {"mock": True}
    
    AzureOpenAIModelConfiguration = MockEvaluator
    IntentResolutionEvaluator = MockEvaluator
    ToolCallAccuracyEvaluator = MockEvaluator
    TaskAdherenceEvaluator = MockEvaluator
    AIAgentConverter = MockEvaluator

# Configuration
project_endpoint = os.environ.get("PROJECT_ENDPOINT", "")
model_deployment_name = os.environ.get("MODEL_DEPLOYMENT_NAME", "gpt-4")
agent_name = "woodgrove-insurance-agent"

# Evaluation Configuration
ENABLE_EVALUATIONS = True  # Enable for agent evaluation feature

# Data directory path
DATA_DIR = Path(__file__).parent / "data"

# Initialize Azure AI client
# In production (containers), use DefaultAzureCredential which picks up Managed Identity.
# Locally, use AzureCliCredential with DEMO_TENANT_ID if set (for cross-tenant dev).
environment = os.environ.get("ENVIRONMENT", "development")
demo_tenant_id = os.environ.get("DEMO_TENANT_ID", "")
if environment == "production":
    print("Using DefaultAzureCredential (managed identity) for production")
    credential = DefaultAzureCredential()
elif demo_tenant_id:
    print(f"Using AzureCliCredential with demo tenant: {demo_tenant_id}")
    credential = AzureCliCredential(tenant_id=demo_tenant_id)
else:
    credential = DefaultAzureCredential()
agents_client = AgentsClient(
  endpoint=project_endpoint,
  credential=credential,
)

# Load data from JSON files
def load_user_profiles():
  """Load user profiles from JSON file"""
  try:
      with open(DATA_DIR / "user_profiles.json", 'r') as f:
          profiles_data = json.load(f)
          return [UserProfile(**profile) for profile in profiles_data]
  except (FileNotFoundError, json.JSONDecodeError) as e:
      print(f"Error loading user profiles: {e}")
      return []

def load_investment_products():
  """Load investment products from JSON file"""
  try:
      with open(DATA_DIR / "investment_products.json", 'r') as f:
          return json.load(f)
  except (FileNotFoundError, json.JSONDecodeError) as e:
      print(f"Error loading investment products: {e}")
      return {"low": [], "medium": [], "high": []}

# Pydantic Models
class UserProfile(BaseModel):
    id: str
    name: str
    age: int = Field(gt=0)
    current_cash: float = Field(ge=0)
    investment_assets: float = Field(ge=0)
    yearly_savings_rate: float = Field(ge=0, le=1)
    salary: float = Field(ge=0)
    portfolio: Dict[str, float]
    risk_appetite: str  # Allow any string value for risk appetite
    target_retire_age: int = Field(gt=0)
    target_monthly_income: float = Field(gt=0)
    description: Optional[str] = None
    advisor_id: Optional[str] = None

class ProductRec(BaseModel):
  name: str
  allocation: float = Field(ge=0, le=1)
  exp_return: Optional[float] = Field(ge=0, le=1)
  risk_rating: Optional[str] = None
  asset_class: Optional[str] = None

class CashflowPoint(BaseModel):
  year: int = Field(ge=0)
  end_assets: float = Field(ge=0)

class Metrics(BaseModel):
  monthly_income: float = Field(ge=0)
  success_rate_pct: float = Field(ge=0, le=100)
  risk_level: str  # Allow any string value for risk level
  flexibility: Optional[str] = None
  time_horizon_years: Optional[int] = Field(ge=0)

class Deltas(BaseModel):
    additional_savings_monthly: Optional[float] = Field(ge=0)
    # Baseline projected sustainable monthly retirement income BEFORE changes (absolute, non-negative)
    retirement_income_monthly: Optional[float] = Field(default=None, ge=0)
    retirement_income_delta: Optional[float] = None
    success_rate_delta_pct: Optional[float] = None
    extra_years_income_duration: Optional[float] = None  # Can be negative (reduced duration), accepts float and rounds to int

class Predictions(BaseModel):
  metrics: Metrics
  deltas: Optional[Deltas] = None
  products: List[ProductRec] = []
  cashflows: List[CashflowPoint] = []

class AnalysisOutput(BaseModel):
  scenario: UserProfile
  recommended_changes: Dict[str, Any]
  predictions: Predictions
  follow_ups: List[str]
  alternatives: List[str]
  considerations: str

# Cashflow validation constants
EXPECTED_CASHFLOW_YEARS = [0, 5, 10, 15, 20, 25]

def enforce_cashflow_horizon(cashflows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize agent-provided cashflows into required 25-year (0..25, 5-year steps) series.

    Improvements over simple forward fill:
    - Uses linear interpolation between provided valid checkpoints to avoid unrealistic flat lines then vertical drops.
    - If depletion (<=0) occurs between two provided points, interpolates the zero crossing year proportionally and clamps later points to 0.
    - If only a single starting point is provided, assumes monotonic decline to 0 only if an explicit non-positive value is given later; otherwise keeps value constant (agent should supply trajectory via code tool).
    - Extra / off-interval years ignored.
    """
    if not isinstance(cashflows, list):
        return [{"year": y, "end_assets": 0.0} for y in EXPECTED_CASHFLOW_YEARS]

    # Collect valid points on expected grid or any interim for interpolation (allow any year 0..25)
    raw_points: List[tuple[int, float]] = []
    for pt in cashflows:
        try:
            y = int(pt.get("year"))
            v = float(pt.get("end_assets"))
        except Exception:
            continue
        if 0 <= y <= 25:
            raw_points.append((y, max(0.0, v)))

    # Deduplicate by year keeping last
    point_map: Dict[int, float] = {}
    for y, v in raw_points:
        point_map[y] = v

    if 0 not in point_map and raw_points:
        # ensure year 0 anchor using earliest value
        earliest_year = min(point_map.keys())
        point_map[0] = point_map[earliest_year]

    # Sorted unique years
    years_sorted = sorted(point_map.keys())
    if not years_sorted:
        return [{"year": y, "end_assets": 0.0} for y in EXPECTED_CASHFLOW_YEARS]

    # Build full 0..25 annual series via interpolation for missing internal years
    annual: Dict[int, float] = {}
    for idx, y in enumerate(years_sorted):
        annual[y] = point_map[y]
        if idx == 0:
            continue
        prev_y = years_sorted[idx - 1]
        prev_v = point_map[prev_y]
        cur_v = point_map[y]
        span = y - prev_y
        if span > 1:
            # Linear interpolation (including potential decline to zero)
            for step in range(1, span):
                interp_y = prev_y + step
                ratio = step / span
                interp_v = prev_v + (cur_v - prev_v) * ratio
                annual[interp_y] = max(0.0, interp_v)

    # Detect depletion crossing between positive -> zero sequences and clamp future
    # If value goes to zero or below, rest after that year is zero
    depleted = False
    for y in range(0, 26):
        if y in annual:
            val = annual[y]
        else:
            # interpolate between nearest known annual points (shouldn't normally happen now)
            # find previous and next known years
            prev_known = max([k for k in annual.keys() if k < y], default=None)
            next_known = min([k for k in annual.keys() if k > y], default=None)
            if prev_known is not None and next_known is not None:
                ratio = (y - prev_known) / (next_known - prev_known)
                val = annual[prev_known] + (annual[next_known] - annual[prev_known]) * ratio
            else:
                val = annual.get(prev_known or next_known or 0, 0.0)
            annual[y] = max(0.0, val)
        if not depleted and annual[y] <= 0:
            annual[y] = 0.0
            depleted = True
        elif depleted:
            annual[y] = 0.0

    # Now sample required 5-year checkpoints
    ordered: List[Dict[str, Any]] = []
    for y in EXPECTED_CASHFLOW_YEARS:
        ordered.append({"year": y, "end_assets": float(round(annual.get(y, 0.0), 2))})
    return ordered

def log_key_metrics(analysis: AnalysisOutput):
  """Print key scenario metrics to console for operational visibility.

  This is invoked every time an agent run produces a valid AnalysisOutput
  (both streaming and non‑streaming endpoints). Keeps output concise.
  """
  try:
      scenario = analysis.scenario
      metrics = analysis.predictions.metrics
      deltas = analysis.predictions.deltas
      products = analysis.predictions.products or []
      cashflows = analysis.predictions.cashflows or []

      print("\n=== Retirement Scenario Metrics ===")
      print(f"Timestamp: {datetime.utcnow().isoformat()}Z")
      print(f"Scenario: {scenario.id if hasattr(scenario,'id') else ''} | {scenario.name} (Age {scenario.age})  Target Monthly Income: ${scenario.target_monthly_income:,.0f}")
      print("-- Core Metrics --")
      print(f"Projected Monthly Income: ${metrics.monthly_income:,.0f}")
      print(f"Success Rate: {metrics.success_rate_pct:.0f}%  Risk Level: {metrics.risk_level}  Time Horizon: {metrics.time_horizon_years} yrs")
      if metrics.flexibility:
          print(f"Flexibility: {metrics.flexibility}")
      if deltas:
          print("-- Deltas (vs baseline) --")
          if deltas.retirement_income_monthly is not None:
              print(f"Baseline Monthly Income: ${deltas.retirement_income_monthly:,.0f}")
          if deltas.retirement_income_delta is not None:
              sign = '+' if deltas.retirement_income_delta >= 0 else ''
              print(f"Progress vs Target: {sign}${deltas.retirement_income_delta:,.0f}")
          if deltas.success_rate_delta_pct is not None:
              sign = '+' if deltas.success_rate_delta_pct >= 0 else ''
              print(f"Success Rate Delta: {sign}{deltas.success_rate_delta_pct:.0f} pp")
          if deltas.extra_years_income_duration is not None:
              sign = '+' if deltas.extra_years_income_duration >= 0 else ''
              print(f"Extra Income Duration: {sign}{deltas.extra_years_income_duration:.0f} yrs")
          if deltas.additional_savings_monthly is not None:
              print(f"Additional Monthly Savings Needed: ${deltas.additional_savings_monthly:,.0f}")
      if products:
          print(f"-- Product Recs ({len(products)}) --")
          for p in products[:5]:  # limit to first 5 for brevity
              alloc_pct = f"{p.allocation*100:.1f}%" if p.allocation is not None else 'n/a'
              exp_ret = f" {p.exp_return*100:.1f}%" if p.exp_return is not None else ''
              print(f"  - {p.name}: {alloc_pct}{exp_ret} {p.risk_rating or ''}".rstrip())
          if len(products) > 5:
              print(f"  ... {len(products)-5} more products")
      if cashflows:
          # Show first & last cashflow points for quick trajectory sense
          first_cf = cashflows[0]
          last_cf = cashflows[-1]
          print(f"-- Asset Trajectory -- Start (Year {first_cf.year}): ${first_cf.end_assets:,.0f}  |  End (Year {last_cf.year}): ${last_cf.end_assets:,.0f}")
      print(f"Considerations: {analysis.considerations[:200]}{'...' if len(analysis.considerations)>200 else ''}")
      print("=== End Scenario Metrics ===\n")
  except Exception as e:
      print(f"Metric logging failed: {e}")

class ChatMessage(BaseModel):
  role: str
  content: str
  timestamp: Optional[float] = None

class ChatRequest(BaseModel):
  message: str
  profile: Optional[UserProfile] = None
  history: List[ChatMessage] = []
  data_source: Optional[str] = None  # "local" (default) or "fabric"

class ChatResponse(BaseModel):
  response: str
  analysis: Optional[AnalysisOutput] = None
  status: str = "completed"

class StreamingChatResponse(BaseModel):
  type: str  # "status", "content", "analysis", "complete"
  data: Dict[str, Any]
  timestamp: float

class ProfilesResponse(BaseModel):
  profiles: List[UserProfile]

# Load data
SAMPLE_PROFILES = load_user_profiles()
INVESTMENT_PRODUCTS = load_investment_products()

# Investment product catalogue
def get_product_catalogue(risk: str = "medium") -> str:
  """Query investment product catalogue by risk level."""
  catalogue = INVESTMENT_PRODUCTS.get("products_by_risk", {}).get(risk, INVESTMENT_PRODUCTS.get("products_by_risk", {}).get("medium", []))
  result = {"products": catalogue}
  return json.dumps(result)

# System instructions for the AI agent
SYSTEM_INSTRUCTIONS = """
You are Woodgrove AI, an AI assistant for insurance underwriters at Woodgrove International.
You help underwriters prepare for applicant meetings, assess risk profiles, and make informed coverage decisions.

YOUR CAPABILITIES:
- Work IQ Calendar: access the underwriter's upcoming meetings and appointment details
- Work IQ Copilot: access emails and files relevant to applicants and cases
- Insurance product catalogue: fetch available products by risk level via get_product_catalogue

HOW TO RESPOND:
- Be conversational, concise, and professional
- Only use tools when they are genuinely relevant to the question
- Do NOT use the code interpreter unless explicitly asked to perform a calculation
- Do NOT return JSON schemas, structured analysis outputs, or cashflow tables unprompted
- When asked about calendar or schedule, use Work IQ Calendar to look up real meeting data
- When asked about an applicant or case, use Work IQ Copilot to surface relevant emails or documents
- When asked about insurance products, use get_product_catalogue

MEETING PREPARATION:
When an underwriter asks about an upcoming meeting or applicant, use Work IQ Calendar to find the meeting,
then use Work IQ Copilot to find any relevant emails or files. Summarise what you find and suggest
what the underwriter should know or prepare before the meeting.

TONE:
You are a knowledgeable colleague, not a form-filling system. Keep responses focused and useful.
If you cannot find real data via the tools, say so clearly — do not fabricate names, dates, or case details."""



# Thread Management
class ThreadManager:
  def __init__(self, agents_client: AgentsClient):
      self.agents_client = agents_client
      self.threads = {}
  
  def get_or_create_thread(self, session_id: str) -> str:
      if session_id not in self.threads:
          thread = self.agents_client.threads.create()
          self.threads[session_id] = thread.id
      return self.threads[session_id]

# Streaming Event Handler
class StreamingRetirementEventHandler(AgentEventHandler):
  def __init__(self, functions: FunctionTool):
      super().__init__()
      self.functions = functions
      self._accumulated_text = ""
      self.status_queue = asyncio.Queue()
      self.current_status = "Starting analysis..."
      self.is_complete = False
      self.run_id = None  # Capture run ID for evaluations


  def on_message_delta(self, delta: MessageDeltaChunk) -> None:
      if delta.delta.content:
          for chunk in delta.delta.content:
              partial_text = chunk.text.get("value", "")
              if partial_text:
                  self._accumulated_text += partial_text
                  self.status_queue.put_nowait({
                      "type": "content",
                      "data": {"content": partial_text},
                      "timestamp": time.time()
                  })

  def _put_status(self, status: str):
      self.status_queue.put_nowait({
          "type": "status",
          "data": {"status": status},
          "timestamp": time.time()
      })

  def on_thread_run(self, run: ThreadRun) -> None:
      if not self.run_id:
          self.run_id = run.id

      if run.status == "in_progress":
          self._put_status("Thinking...")
      elif run.status == "requires_action":
          self._put_status("Looking up insurance products...")
      elif run.status == "failed":
          self._put_status(f"Request failed: {run.last_error}")

      if run.status == "requires_action" and isinstance(run.required_action, SubmitToolOutputsAction):
          tool_calls = run.required_action.submit_tool_outputs.tool_calls
          tool_outputs = []

          for tool_call in tool_calls:
              if tool_call.function.name == "get_product_catalogue":
                  self._put_status("Looking up insurance products...")
                  args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
                  risk = args.get("risk", "medium")
                  result = get_product_catalogue(risk)

                  tool_outputs.append(ToolOutput(
                      tool_call_id=tool_call.id,
                      output=result
                  ))

          if tool_outputs:
              agents_client.runs.submit_tool_outputs_stream(
                  thread_id=run.thread_id,
                  run_id=run.id,
                  tool_outputs=tool_outputs,
                  event_handler=self
              )

  def on_run_step(self, step: RunStep) -> None:
      if step.type == "tool_calls" and step.status == "in_progress":
          self._put_status("Retrieving data...")

  def on_done(self) -> None:
      self.is_complete = True

# Initialize components
user_functions = {get_product_catalogue}
thread_manager = ThreadManager(agents_client)

# Agent setup
def setup_agent():
  """Initialize or find the insurance underwriting agent"""
  try:
      functions = FunctionTool(user_functions)
      base_tools = list(functions.definitions)

      try:
          code_interpreter = CodeInterpreterTool()
          base_tools.extend(code_interpreter.definitions)
      except Exception as e:
          print(f"CodeInterpreter not available: {e}")

      # Build Work IQ MCP tools for M365 calendar and mail context
      mcp_tools = []
      mcp_resources = []
      try:
          copilot = McpTool(
              server_label="work_iq_copilot",
              server_url="https://agent365.svc.cloud.microsoft/agents/servers/mcp_M365Copilot",
          )
          copilot.set_approval_mode("never")
          calendar = McpTool(
              server_label="work_iq_calendar",
              server_url="https://agent365.svc.cloud.microsoft/agents/servers/mcp_M365Calendar",
          )
          calendar.set_approval_mode("never")
          mcp_tools = list(copilot.definitions) + list(calendar.definitions)
          mcp_resources = list(copilot.resources.mcp or []) + list(calendar.resources.mcp or [])
          print("Work IQ MCP tools ready: Work IQ Copilot, Work IQ Calendar")
      except Exception as e:
          print(f"Work IQ MCP tools not available: {e}")

      # Try to find existing agent
      try:
          agents = agents_client.list_agents()
          for existing in agents:
              if existing.name == agent_name:
                  existing_tools = list(existing.tools or [])

                  # Preserve portal-configured tools (e.g. MCP with connection auth);
                  # replace only function/code_interpreter definitions with current code.
                  preserved = [t for t in existing_tools if t.type not in ("function", "code_interpreter")]
                  merged_tools = base_tools + preserved

                  # If the existing agent already has MCP resources, keep them intact
                  # (they carry the Foundry connection reference set via the portal).
                  # Only inject our mcp_resources when creating a fresh agent.
                  has_existing_mcp = any(t.type == "mcp" for t in existing_tools)
                  if has_existing_mcp and existing.tool_resources:
                      tr = existing.tool_resources
                  elif mcp_resources:
                      tr = ToolResources(mcp=mcp_resources)
                      merged_tools = merged_tools + mcp_tools
                  else:
                      tr = None

                  print(f"Updating existing agent {existing.id} — {len(merged_tools)} tools ({len(preserved)} preserved from portal, {len(mcp_tools)} MCP)")
                  return agents_client.update_agent(
                      agent_id=existing.id,
                      model=model_deployment_name,
                      instructions=SYSTEM_INSTRUCTIONS,
                      tools=merged_tools,
                      tool_resources=tr,
                  ), functions
      except Exception as e:
          print(f"Could not list agents: {e}")

      # Create new agent with all tools including Work IQ MCP
      all_tools = base_tools + mcp_tools
      tr = ToolResources(mcp=mcp_resources) if mcp_resources else None
      print(f"Creating new agent '{agent_name}' with {len(all_tools)} tools")
      new_agent = agents_client.create_agent(
          model=model_deployment_name,
          name=agent_name,
          instructions=SYSTEM_INSTRUCTIONS,
          tools=all_tools,
          tool_resources=tr,
      )
      return new_agent, functions
  except Exception as e:
      print(f"Could not initialize Azure AI Agent (tenant mismatch or service unavailable): {e}")
      print("Agent-based chat features will be disabled. Other features will work normally.")
      return None, None

# Initialize agent
_agent_result = setup_agent()
agent = _agent_result[0] if _agent_result else None
functions = _agent_result[1] if _agent_result else None
AGENT_AVAILABLE = agent is not None

# Evaluation Configuration
def setup_evaluators():
    """Setup AI evaluators for agent performance"""
    try:
        if not EVALUATIONS_AVAILABLE:
            print("Azure AI Evaluation not available - using mock evaluators")
            return None, None, None
        
        # Model configuration for evaluators - requires environment variables
        azure_openai_key = os.environ.get("AZURE_OPENAI_KEY")
        if not azure_openai_key:
            print("AZURE_OPENAI_KEY not set - using mock evaluators")
            return None, None, None
        
        model_config = AzureOpenAIModelConfiguration(
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
            api_key=azure_openai_key,
            azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"),
            api_version=os.environ.get("AZURE_API_VERSION", "2024-02-01"),
        )
        
        # Initialize evaluators
        intent_resolution = IntentResolutionEvaluator(model_config=model_config, threshold=3)
        tool_call_accuracy = ToolCallAccuracyEvaluator(model_config=model_config, threshold=3)
        task_adherence = TaskAdherenceEvaluator(model_config=model_config, threshold=3)
        
        # Initialize converter for Azure AI agent messages
        converter = AIAgentConverter(agents_client)
        
        return {
            "intent_resolution": intent_resolution,
            "tool_call_accuracy": tool_call_accuracy, 
            "task_adherence": task_adherence
        }, converter, model_config
    except Exception as e:
        print(f"Failed to setup evaluators: {e}")
        return None, None, None

# Initialize evaluators only if evaluations are enabled
if ENABLE_EVALUATIONS:
    evaluators, converter, model_config = setup_evaluators()
else:
    evaluators, converter, model_config = None, None, None

# In-memory storage for evaluation results
evaluation_cache = {}

async def evaluate_agent_run(thread_id: str, run_id: str) -> Optional[Dict[str, Any]]:
    """Evaluate an agent run and publish results to Azure AI Foundry"""
    if not ENABLE_EVALUATIONS or not evaluators or not converter:
        return {"error": "Evaluations not configured"}
    
    try:
        # Check cache first
        cache_key = f"{thread_id}:{run_id}"
        if cache_key in evaluation_cache:
            return evaluation_cache[cache_key]
        
        # Convert to evaluation format using AIAgentConverter
        evaluation_data = converter.convert(thread_id=thread_id, run_id=run_id)
        
        # Run individual evaluators for frontend response (keep existing behavior)
        results = {}
        
        # Run Intent Resolution evaluation
        try:
            intent_result = evaluators["intent_resolution"](
                query=evaluation_data.get("query", ""),
                response=evaluation_data.get("response", "")
            )
            results["intent_resolution"] = intent_result
        except Exception as e:
            results["intent_resolution"] = {"error": str(e)}
        
        # Run Tool Call Accuracy evaluation
        try:
            if evaluation_data.get("tool_calls") and evaluation_data.get("tool_definitions"):
                tool_result = evaluators["tool_call_accuracy"](
                    query=evaluation_data.get("query", ""),
                    tool_calls=evaluation_data.get("tool_calls", []),
                    tool_definitions=evaluation_data.get("tool_definitions", [])
                )
                results["tool_call_accuracy"] = tool_result
            else:
                results["tool_call_accuracy"] = {"info": "No tool calls to evaluate"}
        except Exception as e:
            results["tool_call_accuracy"] = {"error": str(e)}
        
        # Run Task Adherence evaluation
        try:
            task_result = evaluators["task_adherence"](
                query=evaluation_data.get("query", ""),
                response=evaluation_data.get("response", "")
            )
            results["task_adherence"] = task_result
        except Exception as e:
            results["task_adherence"] = {"error": str(e)}
        
        # Also publish to Azure AI Foundry in background (for dev investigation)
        try:
            import tempfile
            
            # Create temporary JSONL file as required by evaluate() function
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
                json.dump(evaluation_data, f)
                f.write('\n')
                temp_file = f.name
            
            foundry_response = evaluate(
                data=temp_file,  # Pass file path as required
                evaluators={
                    "intent_resolution": evaluators["intent_resolution"],
                    "tool_call_accuracy": evaluators["tool_call_accuracy"],
                    "task_adherence": evaluators["task_adherence"],
                },
                azure_ai_project=os.environ.get("PROJECT_ENDPOINT"),
            )
            studio_url = foundry_response.get("studio_url")
            if studio_url:
                print(f"Evaluation results available in Azure AI Foundry: {studio_url}")
            
            # Clean up temporary file
            os.unlink(temp_file)
            
        except Exception as e:
            print(f"Azure AI Foundry evaluation failed (non-critical): {e}")
        
        # Cache the results
        evaluation_cache[cache_key] = results
        
        return results
        
    except Exception as e:
        print(f"Evaluation failed for run {run_id}: {e}")
        return {"error": f"Evaluation failed: {str(e)}"}

# FastAPI app
app = FastAPI(title="Insurance Underwriting API", version="1.0.0")

# Include advisor and admin routers
from advisor_routes import router as advisor_router
from admin_routes import router as admin_router

app.include_router(advisor_router)
app.include_router(admin_router)

_cors_origins = os.environ.get("CORS_ORIGINS", "https://wonderful-sand-0867c671e.7.azurestaticapps.net")
allowed_origins = [o.strip() for o in _cors_origins.split(",")]

app.add_middleware(
  CORSMiddleware,
  allow_origins=allowed_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.get("/")
async def root():
  return {"message": "Insurance Underwriting API", "status": "active"}

@app.get("/health")
async def health():
  return {
      "status": "healthy",
      "agent_id": agent.id if agent else None,
      "agent_available": AGENT_AVAILABLE
  }


# ─── Fabric Data Agent Endpoints ──────────────────────────────────────────────

@app.get("/api/fabric/health")
async def fabric_health():
    """Check Fabric Data Agent connectivity and SPN token acquisition."""
    return fabric_client.health_check()


@app.post("/api/fabric/query")
async def fabric_query(request: dict):
    """
    Direct query to Fabric Data Agent.
    Body: { "question": "Show me Sarah Chen's portfolio" }
    Returns the raw Fabric Data Agent response.
    """
    if not FABRIC_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Fabric Data Agent is not configured. Set the required environment variables.",
        )
    question = request.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="'question' field is required")

    try:
        result = await fabric_client.query(question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fabric query failed: {str(e)}")


@app.get("/profiles", response_model=ProfilesResponse)
async def get_profiles():
  """Get available user profiles"""
  return ProfilesResponse(profiles=SAMPLE_PROFILES)


# ─── Advisor AI Chat Endpoints ───────────────────────────────────────────────

# Import advisor storage for data enrichment
from advisor_storage import advisor_storage as _advisor_store
from models import EscalationTicket, EscalationReason, EscalationPriority

ADVISOR_SYSTEM_PROMPT = """You are Woodgrove AI, an AI assistant for insurance underwriters. You help underwriters manage their practice,
understand their applicants' risk profiles, and provide data-driven insights for insurance coverage decisions.

You are NOT the applicant's underwriter — you are a tool that helps the underwriter do their job better.

Current date: {today}

## Advisor Profile
Name: {advisor_name}
License: {advisor_license}
Jurisdictions: {advisor_jurisdictions}
Specializations: {advisor_specializations}

## Applicant Coverage Summary
{client_summaries}

## Pending Escalations
{escalation_summaries}

## Upcoming Appointments
{appointment_summaries}

## Regulatory & Compliance Reference Data
{regulatory_summaries}

## Approved Insurance Products
{product_summaries}

## Instructions
- Use specific applicant names, numbers, and data from the context above.
- For regulatory questions, specify which jurisdiction (US or CA) applies.
- When discussing a specific applicant, reference their actual coverage allocation, age, coverage goals, and status.
- If asked for a daily brief, synthesize today's appointments, pending escalations, and at-risk applicants into actionable insights.
- For pre-meeting briefs, focus on the specific applicant's coverage snapshot, recent activity, talking points, and underwriting risks.
- Never invent applicant data that isn't in the context above.
- Do NOT return JSON — respond in natural language with markdown formatting.

## CRITICAL: Response Format
You MUST format every response using this exact markdown structure so the frontend can render it as rich cards.

1. Start with a level-2 heading as the response title: `## Title Here`
2. Use level-3 headings for each section: `### Section Name`
3. Use bold key-value bullet points for data: `- **Label**: Value`
4. Use numbered lists with bold prefixes for steps: `1. **Step Name**: Description`
5. Use plain bullet points for simple lists: `- Item text`
6. Use plain paragraphs for explanatory text.

Example of a CORRECTLY formatted response:

## US Auto Liability Minimums

### Coverage Requirements
- **Typical Minimum BI per Person**: $25,000 [REF:us-minimum-liability-auto]
- **Typical Minimum BI per Occurrence**: $50,000 [REF:us-minimum-liability-auto]
- **Typical Minimum Property Damage**: $10,000 [REF:us-minimum-liability-auto]

### Important Notes
- State minimums are a floor — underwriters recommend significantly higher limits for adequate protection
- Commercial auto follows different rules from personal auto

### Recommended Actions
1. **Review Applicant Coverage**: Confirm liability limits exceed state minimums
2. **Flag Under-Insured Cases**: Escalate applicants carrying only minimum limits
3. **Document Coverage Decisions**: Record all limit election justifications in applicant files

ALWAYS follow this exact format. NEVER use level-1 headings (single #). ALWAYS start with a ## title. Use ### for every section. Use `- **Key**: Value` for any factual data point.

## CRITICAL: Regulatory Citations
Whenever you reference a specific regulatory rule, contribution limit, tax treatment, withdrawal rule, or government benefit from the Regulatory Reference Data above, you MUST cite it inline using the format: [REF:rule-id]

Examples:
- "Typical US auto liability minimums are $25,000/$50,000/$10,000 [REF:us-minimum-liability-auto]"
- "NFIP residential building maximum coverage is $250,000 [REF:us-nfip-flood-requirement]"
- "OSFI requires a minimum LICAT ratio of 90% for Canadian life insurers [REF:ca-iiroc-life-minimum]"

Always cite the most specific rule. If multiple rules apply, cite each one separately.
Only use [REF:id] for rules that exist in the Regulatory Reference Data — never fabricate a reference ID.
"""


async def _build_advisor_context(advisor_id: str) -> str:
    """Build a rich context string with real advisor/client/escalation/appointment data."""
    from datetime import datetime
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Advisor profile
    advisor = await _advisor_store.get_advisor(advisor_id)
    advisor_name = advisor.name if advisor else advisor_id
    advisor_license = advisor.license_number if advisor else "N/A"
    advisor_jurisdictions = ", ".join([j.value if hasattr(j, 'value') else str(j) for j in (advisor.jurisdictions if advisor else [])])
    advisor_specializations = ", ".join(advisor.specializations if advisor else [])
    advisor_jurisdictions_list = [j.value if hasattr(j, 'value') else str(j) for j in (advisor.jurisdictions if advisor else [])]

    # Clients
    clients = await _advisor_store.get_clients_for_advisor(advisor_id)
    client_lines = []
    for c in clients:
        total_assets = c.investment_assets + c.current_cash
        jurisdiction = c.jurisdiction.value if hasattr(c.jurisdiction, 'value') else str(c.jurisdiction)
        status = c.status.value if hasattr(c.status, 'value') else str(c.status)
        portfolio_str = ", ".join(f"{k}: {v*100:.0f}%" for k, v in (c.portfolio or {}).items())
        client_lines.append(
            f"- **{c.name}** (ID: {c.id}) | Age {c.age} | {jurisdiction} | Status: {status} | "
            f"Risk: {c.risk_appetite} | Assets: ${total_assets:,.0f} (cash ${c.current_cash:,.0f} + invested ${c.investment_assets:,.0f}) | "
            f"Portfolio: [{portfolio_str}] | Savings rate: {c.yearly_savings_rate*100:.0f}% of ${c.salary:,.0f} salary | "
            f"Target: retire at {c.target_retire_age}, ${c.target_monthly_income:,.0f}/mo income"
        )
    client_summaries = "\n".join(client_lines) if client_lines else "No clients assigned."

    # Escalations
    escalations = await _advisor_store.get_escalations_for_advisor(advisor_id)
    esc_lines = []
    for e in escalations:
        status = e.status.value if hasattr(e.status, 'value') else str(e.status)
        priority = e.priority.value if hasattr(e.priority, 'value') else str(e.priority)
        # Find client name
        client_name = e.client_id
        for c in clients:
            if c.id == e.client_id:
                client_name = c.name
                break
        esc_lines.append(
            f"- [{priority.upper()}] {client_name}: \"{e.client_question}\" (status: {status}, created: {e.created_at[:10]})"
        )
    escalation_summaries = "\n".join(esc_lines) if esc_lines else "No pending escalations."

    # Appointments
    appointments = await _advisor_store.get_appointments_for_advisor(advisor_id)
    appt_lines = []
    for a in appointments:
        status = a.status.value if hasattr(a.status, 'value') else str(a.status)
        meeting_type = a.meeting_type.value if hasattr(a.meeting_type, 'value') else str(a.meeting_type)
        # Find client name
        client_name = a.client_id
        for c in clients:
            if c.id == a.client_id:
                client_name = c.name
                break
        is_today = a.scheduled_at[:10] == today
        day_label = "TODAY" if is_today else a.scheduled_at[:10]
        appt_lines.append(
            f"- [{day_label}] {a.scheduled_at[11:16]} — {client_name} ({meeting_type}, {a.duration_minutes}min, {status})"
            + (f"\n  Agenda: {a.agenda}" if a.agenda else "")
        )
    appointment_summaries = "\n".join(appt_lines) if appt_lines else "No upcoming appointments."

    # Load regulatory rules
    import os
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    regulatory_summaries = "No regulatory data available."
    try:
        with open(os.path.join(data_dir, "regulatory_rules.json"), "r") as f:
            all_rules = json.load(f)
        # Filter to active rules for advisor's jurisdictions
        relevant_rules = [r for r in all_rules if r.get("is_active", True) and r.get("jurisdiction") in advisor_jurisdictions_list]
        rule_lines = []
        for r in relevant_rules:
            vals = r.get("current_values", {})
            vals_str = ", ".join(f"{k}: {v}" for k, v in vals.items())
            source = r.get("source_url", "")
            rule_lines.append(
                f"- **[{r['id']}]** {r['title']} ({r['jurisdiction']}, {r['category']}): {r['description']}\n"
                f"  Values: {vals_str}\n"
                f"  Source: {source}\n"
                f"  Last verified: {r.get('last_verified', 'N/A')}"
            )
        regulatory_summaries = "\n".join(rule_lines) if rule_lines else "No regulatory rules for advisor's jurisdictions."
    except Exception as e:
        print(f"Warning: Could not load regulatory rules: {e}")

    # Load investment products
    product_summaries = "No product data available."
    try:
        with open(os.path.join(data_dir, "investment_products.json"), "r") as f:
            products_data = json.load(f)
        product_lines = []
        for risk_level, products in products_data.get("products_by_risk", {}).items():
            for p in products:
                product_lines.append(
                    f"- [{risk_level.upper()}] {p['name']}: {p['description']} "
                    f"(exp. return: {p['exp_return']*100:.1f}%, expense ratio: {p['expense_ratio']*100:.2f}%, "
                    f"min investment: ${p['minimum_investment']:,})"
                )
        product_summaries = "\n".join(product_lines) if product_lines else "No products in catalog."
    except Exception as e:
        print(f"Warning: Could not load investment products: {e}")

    return ADVISOR_SYSTEM_PROMPT.format(
        today=today,
        advisor_name=advisor_name,
        advisor_license=advisor_license,
        advisor_jurisdictions=advisor_jurisdictions,
        advisor_specializations=advisor_specializations,
        client_summaries=client_summaries,
        escalation_summaries=escalation_summaries,
        appointment_summaries=appointment_summaries,
        regulatory_summaries=regulatory_summaries,
        product_summaries=product_summaries,
    )


class AdvisorChatRequest(BaseModel):
    message: str
    advisor_id: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[ChatMessage]] = []
    skip_mcp: bool = False  # Skip MCP KB lookup; use AI agent directly (for generation tasks)


class PreMeetingBriefRequest(BaseModel):
    advisor_id: str
    client_id: str
    appointment_id: str


PRE_MEETING_BRIEF_PROMPT = """Using the client data and context above, generate a structured pre-meeting brief for the upcoming appointment with client "{client_id}" (appointment "{appointment_id}").

You MUST respond with ONLY valid JSON (no markdown, no code fences, no extra text). The JSON must follow this exact schema:

{{
  "client_summary": "A 2-3 sentence overview of the client's situation and retirement readiness.",
  "financial_snapshot": {{
    "total_assets": <number>,
    "invested_assets": <number>,
    "cash_reserves": <number>,
    "annual_savings": <number>,
    "savings_rate_percent": <number>,
    "portfolio_allocation": {{ "stocks": <percent>, "bonds": <percent>, ... }},
    "goal_progress_percent": <number 0-100>,
    "risk_score": <number 0-100>,
    "key_concerns": ["concern1", "concern2"]
  }},
  "talking_points": [
    {{
      "title": "Short topic title",
      "detail": "1-2 sentence explanation of what to discuss",
      "priority": "high" | "medium" | "low",
      "category": "performance" | "contribution" | "tax" | "risk" | "planning" | "regulatory"
    }}
  ],
  "risks": [
    {{
      "title": "Risk title",
      "detail": "Brief risk description",
      "severity": "high" | "medium" | "low"
    }}
  ],
  "opportunities": [
    {{
      "title": "Opportunity title",
      "detail": "Brief description of the opportunity",
      "impact": "high" | "medium" | "low"
    }}
  ],
  "meeting_agenda": [
    "Agenda item 1",
    "Agenda item 2"
  ],
  "regulatory_considerations": [
    {{
      "rule_id": "rule-id-if-applicable",
      "title": "Rule or consideration title",
      "detail": "Brief explanation of relevance to this client"
    }}
  ],
  "recent_activity": {{
    "scenarios_explored": ["scenario1", "scenario2"],
    "questions_asked": ["question1", "question2"],
    "last_login": "ISO date string or 'Unknown'"
  }}
}}

Use REAL data from the client context above. Calculate goal_progress_percent using the 4% rule (target_monthly_income * 12 * 25 = target fund).
Provide 3-5 talking points, 2-4 risks, 2-4 opportunities, and 4-6 agenda items.
All numbers should be actual numbers (not strings). All arrays should have at least one item.
Respond with ONLY the JSON object — no explanation, no markdown."""


@app.post("/advisor/pre-meeting-brief")
async def generate_pre_meeting_brief_endpoint(request: PreMeetingBriefRequest):
    """Generate a structured pre-meeting brief using the LLM."""
    try:
        system_prompt = await _build_advisor_context(request.advisor_id)
        user_message = PRE_MEETING_BRIEF_PROMPT.format(
            client_id=request.client_id,
            appointment_id=request.appointment_id,
        )

        thread = agents_client.threads.create()
        agents_client.messages.create(
            thread_id=thread.id,
            role="user",
            content=f"SYSTEM CONTEXT:\n{system_prompt}\n\n---\n\n{user_message}",
        )

        class TextHandler(AgentEventHandler):
            def __init__(self):
                super().__init__()
                self.text = ""

            def on_message_delta(self, delta: MessageDeltaChunk):
                if delta.delta.content:
                    for chunk in delta.delta.content:
                        self.text += chunk.text.get("value", "")

            def on_thread_run(self, run: ThreadRun):
                if run.status == "requires_action" and isinstance(run.required_action, SubmitToolOutputsAction):
                    tool_calls = run.required_action.submit_tool_outputs.tool_calls
                    tool_outputs = []
                    for tc in tool_calls:
                        if tc.function.name == "get_product_catalogue":
                            args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                            result = get_product_catalogue(args.get("risk", "medium"))
                            tool_outputs.append(ToolOutput(tool_call_id=tc.id, output=result))
                    if tool_outputs:
                        agents_client.runs.submit_tool_outputs_stream(
                            thread_id=run.thread_id, run_id=run.id,
                            tool_outputs=tool_outputs, event_handler=self,
                        )

        handler = TextHandler()
        with agents_client.runs.stream(
            thread_id=thread.id, agent_id=agent.id, event_handler=handler,
        ) as stream:
            for _ in stream:
                pass

        # Parse the JSON response from the LLM
        raw = handler.text.strip()
        # Strip markdown code fences if the LLM added them despite instructions
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        brief_data = json.loads(raw)
        brief_data["id"] = f"brief-{request.appointment_id}"
        brief_data["appointment_id"] = request.appointment_id
        brief_data["generated_at"] = datetime.utcnow().isoformat() + "Z"

        return brief_data

    except json.JSONDecodeError as e:
        print(f"Pre-meeting brief JSON parse error: {e}\nRaw response: {handler.text[:500]}")
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON for pre-meeting brief")
    except Exception as e:
        print(f"Pre-meeting brief error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



class ScenarioAnalysisRequest(BaseModel):
    advisor_id: str
    clients: List[Dict[str, Any]]
    scenario_type: str
    scenario_description: str
    scenario_params: Dict[str, Any]


SCENARIO_ANALYSIS_PROMPT = """Using the advisor context above and the client data provided below, run a "{scenario_description}" scenario analysis.

Scenario type: {scenario_type}
Parameters: {scenario_params}

Clients to analyze:
{client_summaries}

You MUST respond with ONLY valid JSON (no markdown, no code fences, no extra text). The JSON must follow this exact schema:

{{
  "headline": "<Short 5-8 word headline summarizing the overall scenario outcome>",
  "overall_summary": "<2-3 sentence summary of cross-client insights and the overall impact of this scenario>",
  "overall_recommendation": "<1-2 sentence portfolio-wide recommendation for the advisor>",
  "client_analyses": [
    {{
      "client_id": "<client id>",
      "client_name": "<client name>",
      "current_outlook": {{
        "success_rate": <number 0-100>,
        "monthly_income": <number>,
        "assessment": "<1 sentence current outlook summary>"
      }},
      "scenario_impact": {{
        "direction": "positive" | "negative" | "neutral",
        "success_rate_change": <number, can be negative>,
        "new_success_rate": <number 0-100>,
        "income_change": <number, can be negative>,
        "new_monthly_income": <number>,
        "summary": "<1-2 sentence description of impact>"
      }},
      "risk_level": "high" | "medium" | "low",
      "recommendation": "<1-2 sentence specific actionable advice for this client>"
    }}
  ],
  "key_insights": [
    {{
      "title": "<3-6 word insight title>",
      "detail": "<1 sentence explanation>",
      "type": "warning" | "info" | "success"
    }}
  ],
  "suggested_actions": [
    {{
      "action": "<Specific action the advisor should take>",
      "priority": "high" | "medium" | "low",
      "affected_clients": ["<client_id1>", "<client_id2>"]
    }}
  ]
}}

Use realistic financial projections based on actual portfolio allocations, savings rates, and time horizons.
Provide analysis for ALL clients listed above.
All numbers should be actual numbers (not strings).
Respond with ONLY the JSON object."""


@app.post("/advisor/scenario-analysis")
async def generate_scenario_analysis_endpoint(request: ScenarioAnalysisRequest):
    """Generate a structured cross-client scenario analysis using the LLM."""
    try:
        system_prompt = await _build_advisor_context(request.advisor_id)

        client_summaries = "\n".join([
            f"- {c.get('name', c.get('id', 'Unknown'))} (ID: {c.get('id', 'unknown')}): "
            f"age {c.get('age', 'N/A')}, {c.get('jurisdiction', 'N/A')}, "
            f"{c.get('risk_appetite', 'medium')} risk, "
            f"${c.get('investment_assets', 0) + c.get('current_cash', 0):,.0f} total assets, "
            f"portfolio [{', '.join(f'{k}: {v*100:.0f}%' for k, v in c.get('portfolio', {}).items())}], "
            f"saves {c.get('yearly_savings_rate', 0)*100:.0f}% of ${c.get('salary', 0):,.0f}, "
            f"target retire at {c.get('target_retire_age', 65)} with ${c.get('target_monthly_income', 0):,.0f}/mo"
            for c in request.clients
        ])

        user_message = SCENARIO_ANALYSIS_PROMPT.format(
            scenario_description=request.scenario_description,
            scenario_type=request.scenario_type,
            scenario_params=json.dumps(request.scenario_params),
            client_summaries=client_summaries,
        )

        thread = agents_client.threads.create()
        agents_client.messages.create(
            thread_id=thread.id,
            role="user",
            content=f"SYSTEM CONTEXT:\n{system_prompt}\n\n---\n\n{user_message}",
        )

        class TextHandler(AgentEventHandler):
            def __init__(self):
                super().__init__()
                self.text = ""

            def on_message_delta(self, delta: MessageDeltaChunk):
                if delta.delta.content:
                    for chunk in delta.delta.content:
                        self.text += chunk.text.get("value", "")

            def on_thread_run(self, run: ThreadRun):
                if run.status == "requires_action" and isinstance(run.required_action, SubmitToolOutputsAction):
                    tool_calls = run.required_action.submit_tool_outputs.tool_calls
                    tool_outputs = []
                    for tc in tool_calls:
                        if tc.function.name == "get_product_catalogue":
                            args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                            result = get_product_catalogue(args.get("risk", "medium"))
                            tool_outputs.append(ToolOutput(tool_call_id=tc.id, output=result))
                    if tool_outputs:
                        agents_client.runs.submit_tool_outputs_stream(
                            thread_id=run.thread_id, run_id=run.id,
                            tool_outputs=tool_outputs, event_handler=self,
                        )

        handler = TextHandler()
        with agents_client.runs.stream(
            thread_id=thread.id, agent_id=agent.id, event_handler=handler,
        ) as stream:
            for _ in stream:
                pass

        raw = handler.text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        analysis_data = json.loads(raw)
        return analysis_data

    except json.JSONDecodeError as e:
        print(f"Scenario analysis JSON parse error: {e}\nRaw response: {handler.text[:500]}")
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON for scenario analysis")
    except Exception as e:
        print(f"Scenario analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _load_regulatory_rules_map() -> Dict[str, Dict]:
    """Load regulatory rules into a dict keyed by rule ID for citation lookup."""
    import os
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    try:
        with open(os.path.join(data_dir, "regulatory_rules.json"), "r") as f:
            rules = json.load(f)
        return {r["id"]: r for r in rules}
    except Exception:
        return {}


def _extract_citations(text: str) -> tuple:
    """Extract [REF:rule-id] citations from LLM output.
    Returns (clean_text, citations_list) where citations have title, source, rule_id, description.
    """
    import re
    rules_map = _load_regulatory_rules_map()
    pattern = re.compile(r'\[REF:([a-zA-Z0-9_-]+)\]')
    found_ids = list(dict.fromkeys(pattern.findall(text)))  # unique, ordered

    citations = []
    for rule_id in found_ids:
        rule = rules_map.get(rule_id)
        if rule:
            citations.append({
                "id": rule_id,
                "title": rule.get("title", rule_id),
                "source": rule.get("source_url", ""),
                "description": rule.get("description", ""),
                "jurisdiction": rule.get("jurisdiction", ""),
                "category": rule.get("category", ""),
                "values": rule.get("current_values", {}),
                "last_verified": rule.get("last_verified", ""),
            })

    return text, citations


class MCPQueryError(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def _load_sage_kb_mcp_config_from_workspace() -> Dict[str, Any]:
    workspace_mcp = Path(__file__).resolve().parent.parent / ".vscode" / "mcp.json"
    try:
        with open(workspace_mcp, "r", encoding="utf-8") as f:
            config = json.load(f)
        server = config.get("servers", {}).get("sage-advisor-kb", {})
        headers = server.get("headers", {}) if isinstance(server.get("headers", {}), dict) else {}
        return {
            "url": server.get("url", ""),
            "api_key": headers.get("api-key", ""),
        }
    except Exception:
        return {"url": "", "api_key": ""}


def _get_sage_kb_mcp_config() -> Dict[str, Any]:
    workspace_config = _load_sage_kb_mcp_config_from_workspace()
    timeout_default = 8.0
    try:
        timeout_default = float(os.environ.get("SAGE_KB_MCP_TIMEOUT_SECONDS", "8"))
    except ValueError:
        timeout_default = 8.0

    retry_default = 1
    try:
        retry_default = max(0, int(os.environ.get("SAGE_KB_MCP_RETRIES", "1")))
    except ValueError:
        retry_default = 1

    return {
        "url": os.environ.get("SAGE_KB_MCP_URL", workspace_config.get("url", "")),
        "api_key": os.environ.get("SAGE_KB_MCP_API_KEY", workspace_config.get("api_key", "")),
        "timeout_seconds": timeout_default,
        "tool_name": os.environ.get("SAGE_KB_MCP_TOOL_NAME", "knowledge_base_retrieve"),
        "retries": retry_default,
    }


def _build_mcp_tool_arguments(
    tool_name: str,
    message: str,
    advisor_id: str,
    context: Optional[Dict[str, Any]],
    compact_history: List[Dict[str, Any]],
) -> Dict[str, Any]:
    if tool_name == "knowledge_base_retrieve":
        intents = [message]
        topic = (context or {}).get("topic") if isinstance(context, dict) else None
        if isinstance(topic, str) and topic.strip() and topic.strip().lower() != message.strip().lower():
            intents.append(topic.strip())
        return {
            "request": {
                "knowledgeBaseIntents": intents[:3],
            }
        }

    return {
        "query": message,
        "advisor_id": advisor_id,
        "context": context or {},
        "history": compact_history,
    }


def _normalize_mcp_citations(raw_payload: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_payload, list):
        return []

    citations: List[Dict[str, Any]] = []
    for item in raw_payload:
        if isinstance(item, str):
            citations.append({"title": item, "source": ""})
            continue

        if not isinstance(item, dict):
            continue

        source = item.get("source") or item.get("url") or item.get("link") or ""
        title = item.get("title") or item.get("name") or source or "Reference"
        citation = {
            "id": item.get("id", ""),
            "title": title,
            "source": source,
            "description": item.get("description", ""),
            "jurisdiction": item.get("jurisdiction", ""),
            "category": item.get("category", ""),
            "values": item.get("values", {}),
            "last_verified": item.get("last_verified", ""),
        }
        citations.append(citation)

    return citations


def _build_mcp_ref_context_map(response_text: str) -> Dict[str, List[str]]:
    context_map: Dict[str, List[str]] = {}
    if not isinstance(response_text, str) or not response_text.strip():
        return context_map

    fragments = re.split(r"(?<=[.!?])\s+", response_text)
    marker_pattern = re.compile(r"\[ref_id\s*:\s*(\d+)\]", flags=re.IGNORECASE)

    for fragment in fragments:
        if not isinstance(fragment, str) or not fragment.strip():
            continue

        fragment_ref_ids: List[str] = []
        for match in marker_pattern.finditer(fragment):
            rid = match.group(1)
            if rid not in fragment_ref_ids:
                fragment_ref_ids.append(rid)

        if not fragment_ref_ids:
            continue

        cleaned_fragment = marker_pattern.sub("", fragment)
        cleaned_fragment = re.sub(r"\s+", " ", cleaned_fragment).strip()
        if not cleaned_fragment:
            continue

        for rid in fragment_ref_ids:
            contexts = context_map.setdefault(rid, [])
            if cleaned_fragment not in contexts:
                contexts.append(cleaned_fragment)

    return context_map


def _normalize_mcp_response(raw_response: Any) -> Dict[str, Any]:
    if not isinstance(raw_response, dict):
        raise MCPQueryError("mcp_invalid_response")

    result = raw_response.get("result", raw_response)
    if not isinstance(result, dict):
        raise MCPQueryError("mcp_invalid_result")

    text_candidates: List[str] = []
    for field in ["response", "answer", "text", "output", "message"]:
        value = result.get(field)
        if isinstance(value, str) and value.strip():
            text_candidates.append(value.strip())

    content = result.get("content")
    if isinstance(content, list):
        parts: List[str] = []
        for chunk in content:
            if isinstance(chunk, dict):
                chunk_text = chunk.get("text")
                if isinstance(chunk_text, str) and chunk_text.strip():
                    parts.append(chunk_text.strip())
            elif isinstance(chunk, str) and chunk.strip():
                parts.append(chunk.strip())
        if parts:
            text_candidates.append("\n".join(parts))

    data = result.get("data")
    if isinstance(data, dict):
        for field in ["response", "answer", "text", "output"]:
            value = data.get(field)
            if isinstance(value, str) and value.strip():
                text_candidates.append(value.strip())

    response_text = text_candidates[0].strip() if text_candidates else ""
    if not response_text:
        raise MCPQueryError("mcp_empty_response")

    no_answer_markers = [
        "sorry, i could not find an answer for your query",
        "i could not find an answer for your query",
        "no relevant information found",
    ]
    lowered = response_text.lower()
    if any(marker in lowered for marker in no_answer_markers):
        raise MCPQueryError("mcp_no_answer")

    raw_citations = result.get("citations")
    if raw_citations is None and isinstance(data, dict):
        raw_citations = data.get("citations") or data.get("sources") or data.get("references")
    if raw_citations is None:
        raw_citations = result.get("sources") or result.get("references")

    citations = _normalize_mcp_citations(raw_citations)

    # Some MCP responses return inline markers like [ref_id:0] without citation metadata.
    # Convert them into the existing [REF:id] pattern and synthesize lightweight citations
    # so the current frontend can render citation chips and Foundry IQ attribution.
    if not citations:
        ref_ids = []
        for match in re.findall(r"\[ref_id\s*:\s*(\d+)\]", response_text, flags=re.IGNORECASE):
            if match not in ref_ids:
                ref_ids.append(match)

        if ref_ids:
            context_map = _build_mcp_ref_context_map(response_text)

            for rid in ref_ids:
                response_text = re.sub(
                    rf"\[ref_id\s*:\s*{re.escape(rid)}\]",
                    f"[REF:mcp-ref-{rid}]",
                    response_text,
                    flags=re.IGNORECASE,
                )

            citations = []
            for index, rid in enumerate(ref_ids, start=1):
                contexts = context_map.get(rid, [])

                if contexts:
                    title = contexts[0]
                    if len(title) > 90:
                        title = f"{title[:89]}…"
                else:
                    title = f"MCP Reference {index}"

                if contexts:
                    description = " ".join(contexts[:2]).strip()
                else:
                    description = "Reference marker provided by MCP response."

                citations.append(
                    {
                        "id": f"mcp-ref-{rid}",
                        "title": title,
                        "source": "",
                        "description": description,
                        "jurisdiction": "",
                        "category": "",
                        "values": {},
                        "last_verified": "",
                    }
                )

    return {"response": response_text, "citations": citations}


def _execute_mcp_request(url: str, api_key: str, timeout_seconds: float, payload: Dict[str, Any]) -> Dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(url=url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json, text/event-stream")
    if api_key:
        req.add_header("api-key", api_key)

    try:
        with urllib_request.urlopen(req, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8", errors="ignore")
    except urllib_error.HTTPError as e:
        body_text = ""
        try:
            body_text = e.read().decode("utf-8", errors="ignore")
        except Exception:
            body_text = ""
        raise MCPQueryError(f"mcp_http_{e.code}:{body_text[:200]}")

    stripped = raw.strip()
    for line in stripped.splitlines():
        if line.startswith("data:"):
            stripped = line[5:].strip()
            break

    parsed = json.loads(stripped) if stripped else {}
    if not isinstance(parsed, dict):
        raise MCPQueryError("mcp_non_json_object")
    if parsed.get("error"):
        raise MCPQueryError("mcp_error")
    return parsed


async def _query_sage_kb_mcp(
    message: str,
    advisor_id: str,
    context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    config = _get_sage_kb_mcp_config()
    url = config.get("url", "")
    api_key = config.get("api_key", "")
    timeout_seconds = float(config.get("timeout_seconds", 4.0))
    tool_name = config.get("tool_name", "knowledge_base_retrieve")
    retries = int(config.get("retries", 1))

    if not url:
        raise MCPQueryError("mcp_not_configured")

    compact_history = []
    if history:
        for msg in history[-6:]:
            role = getattr(msg, "role", None)
            content = getattr(msg, "content", None)
            if role and content:
                compact_history.append({"role": role, "content": content})

    payloads = [
        {
            "jsonrpc": "2.0",
            "id": "sage-kb-1",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": _build_mcp_tool_arguments(
                    tool_name=tool_name,
                    message=message,
                    advisor_id=advisor_id,
                    context=context,
                    compact_history=compact_history,
                ),
            },
        },
    ]

    started = time.perf_counter()
    last_error = "mcp_unavailable"

    for payload in payloads:
        for attempt in range(retries + 1):
            try:
                raw = await asyncio.to_thread(
                    _execute_mcp_request,
                    url,
                    api_key,
                    timeout_seconds,
                    payload,
                )
                normalized = _normalize_mcp_response(raw)
                latency_ms = int((time.perf_counter() - started) * 1000)
                normalized["latency_ms"] = latency_ms
                return normalized
            except (urllib_error.URLError, TimeoutError):
                last_error = "mcp_transport_error"
                if attempt < retries:
                    await asyncio.sleep(0.25)
                    continue
            except json.JSONDecodeError:
                last_error = "mcp_invalid_json"
            except MCPQueryError as e:
                last_error = e.reason
            except Exception:
                last_error = "mcp_unknown_error"
            break

    raise MCPQueryError(last_error)


@app.post("/advisor/chat")
async def advisor_chat(request: AdvisorChatRequest):
    """Non-streaming advisor chat with real LLM and enriched context."""
    try:
        if not request.skip_mcp:
            try:
                mcp_result = await _query_sage_kb_mcp(
                    message=request.message,
                    advisor_id=request.advisor_id,
                    context=request.context,
                    history=request.history,
                )
                print(f"Advisor chat MCP success: latency={mcp_result.get('latency_ms', -1)}ms")
                return {
                    "response": mcp_result["response"],
                    "citations": mcp_result.get("citations", []),
                }
            except MCPQueryError as mcp_error:
                print(f"Advisor chat MCP fallback: reason={mcp_error.reason}")
        else:
            print("Advisor chat: skip_mcp=true, using AI agent directly")

        # Check if agent is available for fallback
        if not AGENT_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="AI agent service is temporarily unavailable (tenant configuration issue). Please try again later."
            )

        system_prompt = await _build_advisor_context(request.advisor_id)

        # Create a dedicated thread for this advisor conversation
        thread = agents_client.threads.create()

        # Send system context + user message
        agents_client.messages.create(
            thread_id=thread.id,
            role="user",
            content=f"SYSTEM CONTEXT:\n{system_prompt}\n\n---\n\nADVISOR QUESTION:\n{request.message}",
        )

        # Run the agent and collect response
        class TextHandler(AgentEventHandler):
            def __init__(self):
                super().__init__()
                self.text = ""

            def on_message_delta(self, delta: MessageDeltaChunk):
                if delta.delta.content:
                    for chunk in delta.delta.content:
                        self.text += chunk.text.get("value", "")

            def on_thread_run(self, run: ThreadRun):
                if run.status == "requires_action" and isinstance(run.required_action, SubmitToolOutputsAction):
                    tool_calls = run.required_action.submit_tool_outputs.tool_calls
                    tool_outputs = []
                    for tc in tool_calls:
                        if tc.function.name == "get_product_catalogue":
                            args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                            result = get_product_catalogue(args.get("risk", "medium"))
                            tool_outputs.append(ToolOutput(tool_call_id=tc.id, output=result))
                    if tool_outputs:
                        agents_client.runs.submit_tool_outputs_stream(
                            thread_id=run.thread_id, run_id=run.id,
                            tool_outputs=tool_outputs, event_handler=self,
                        )

        handler = TextHandler()
        with agents_client.runs.stream(
            thread_id=thread.id, agent_id=agent.id, event_handler=handler,
        ) as stream:
            for _ in stream:
                pass

        clean_text, citations = _extract_citations(handler.text)
        return {"response": clean_text, "citations": citations}

    except Exception as e:
        print(f"Advisor chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/advisor/chat/stream")
async def advisor_chat_stream(request: AdvisorChatRequest):
    """Streaming advisor chat — sends SSE events with type 'content' and 'complete'."""
    try:
        if not request.skip_mcp:
            try:
                mcp_result = await _query_sage_kb_mcp(
                    message=request.message,
                    advisor_id=request.advisor_id,
                    context=request.context,
                    history=request.history,
                )
                print(f"Advisor chat stream MCP success: latency={mcp_result.get('latency_ms', -1)}ms")

                async def generate_mcp():
                    response_text = mcp_result["response"]
                    citations = mcp_result.get("citations", [])
                    chunk_size = 240
                    for idx in range(0, len(response_text), chunk_size):
                        chunk = response_text[idx:idx + chunk_size]
                        if chunk:
                            yield f"data: {json.dumps({'type': 'content', 'data': chunk})}\n\n"
                            await asyncio.sleep(0)
                    yield f"data: {json.dumps({'type': 'complete', 'data': {'response': response_text, 'citations': citations}})}\n\n"

                return StreamingResponse(
                    generate_mcp(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
                )
            except MCPQueryError as mcp_error:
                print(f"Advisor chat stream MCP fallback: reason={mcp_error.reason}")
        else:
            print("Advisor chat stream: skip_mcp=true, using AI agent directly")

        # Check if agent is available for fallback
        if not AGENT_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="AI agent service is temporarily unavailable (tenant configuration issue). Please try again later."
            )

        system_prompt = await _build_advisor_context(request.advisor_id)

        # Create a dedicated thread for this advisor conversation
        thread = agents_client.threads.create()

        # Build full message with history context
        history_text = ""
        if request.history:
            for msg in request.history[-10:]:  # Last 10 messages for context
                role_label = "Underwriter" if msg.role == "user" else "Woodgrove AI"
                history_text += f"{role_label}: {msg.content}\n\n"

        full_message = f"SYSTEM CONTEXT:\n{system_prompt}\n\n"
        if history_text:
            full_message += f"CONVERSATION HISTORY:\n{history_text}\n---\n\n"
        full_message += f"ADVISOR QUESTION:\n{request.message}"

        agents_client.messages.create(
            thread_id=thread.id,
            role="user",
            content=full_message,
        )

        async def generate():
            accumulated = ""

            class StreamHandler(AgentEventHandler):
                def __init__(self):
                    super().__init__()
                    self.chunks = asyncio.Queue()
                    self.done = False

                def on_message_delta(self, delta: MessageDeltaChunk):
                    if delta.delta.content:
                        for chunk in delta.delta.content:
                            text = chunk.text.get("value", "")
                            if text:
                                self.chunks.put_nowait(text)

                def on_done(self):
                    self.done = True

                def on_thread_run(self, run: ThreadRun):
                    if run.status == "requires_action" and isinstance(run.required_action, SubmitToolOutputsAction):
                        tool_calls = run.required_action.submit_tool_outputs.tool_calls
                        tool_outputs = []
                        for tc in tool_calls:
                            if tc.function.name == "get_product_catalogue":
                                args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                                result = get_product_catalogue(args.get("risk", "medium"))
                                tool_outputs.append(ToolOutput(tool_call_id=tc.id, output=result))
                        if tool_outputs:
                            agents_client.runs.submit_tool_outputs_stream(
                                thread_id=run.thread_id, run_id=run.id,
                                tool_outputs=tool_outputs, event_handler=self,
                            )

            handler = StreamHandler()

            async def run_agent():
                with agents_client.runs.stream(
                    thread_id=thread.id, agent_id=agent.id, event_handler=handler,
                ) as stream:
                    for _ in stream:
                        await asyncio.sleep(0.01)
                handler.done = True

            task = asyncio.create_task(run_agent())

            while not handler.done or not handler.chunks.empty():
                try:
                    chunk = await asyncio.wait_for(handler.chunks.get(), timeout=0.1)
                    accumulated += chunk
                    yield f"data: {json.dumps({'type': 'content', 'data': chunk})}\n\n"
                except asyncio.TimeoutError:
                    if task.done():
                        # Drain remaining chunks
                        while not handler.chunks.empty():
                            chunk = handler.chunks.get_nowait()
                            accumulated += chunk
                            yield f"data: {json.dumps({'type': 'content', 'data': chunk})}\n\n"
                        break

            await task

            clean_text, citations = _extract_citations(accumulated)
            yield f"data: {json.dumps({'type': 'complete', 'data': {'response': clean_text, 'citations': citations}})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    except Exception as e:
        print(f"Advisor chat stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate/{thread_id}/{run_id}")
async def evaluate_run(thread_id: str, run_id: str):
  """Evaluate an agent run with IntentResolution, ToolCallAccuracy, and TaskAdherence"""
  try:
      results = await evaluate_agent_run(thread_id, run_id)
      
      if results is None:
          raise HTTPException(status_code=503, detail="Evaluation service not available")
      
      return {
          "status": "completed",
          "thread_id": thread_id,
          "run_id": run_id, 
          "evaluations": results,
          "timestamp": time.time()
      }
      
  except Exception as e:
      raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest, http_request: FastAPIRequest):
  """Streaming chat endpoint with real-time status updates"""
  use_fabric = (request.data_source == "fabric")

  # ── Fabric-only streaming path ─────────────────────────────────────────
  if use_fabric:
      if not FABRIC_AVAILABLE:
          raise HTTPException(
              status_code=503,
              detail="Fabric Data Agent is not configured. Set FABRIC_TENANT_ID, "
                     "FABRIC_CLIENT_ID, FABRIC_CLIENT_SECRET, FABRIC_DATA_AGENT_URL, "
                     "FABRIC_DATA_AGENT_ID in your .env file.",
          )

      async def fabric_generate_stream():
          import time as _t
          # 1. Query Fabric Data Agent for client/portfolio data
          yield f"data: {json.dumps({'type': 'status', 'data': {'status': 'Querying Fabric Data Agent for client data...'}, 'timestamp': _t.time()})}\n\n"

          try:
              fabric_result = await fabric_client.query(request.message, timeout=60)
          except Exception as e:
              yield f"data: {json.dumps({'type': 'error', 'data': {'error': f'Fabric query failed: {e}'}, 'timestamp': _t.time()})}\n\n"
              return

          # 2. If we have an Azure AI Agent, enrich with Fabric data and run analysis
          if AGENT_AVAILABLE:
              yield f"data: {json.dumps({'type': 'status', 'data': {'status': 'Analyzing with AI Agent (Fabric data)...'}, 'timestamp': _t.time()})}\n\n"

              profile = request.profile or SAMPLE_PROFILES[0]
              enriched_prompt = build_fabric_enriched_prompt(
                  request.message,
                  fabric_result,
                  original_profile=profile.dict() if profile else None,
              )

              # Use the same Azure AI Agent but with Fabric-enriched prompt
              thread_id = thread_manager.get_or_create_thread("fabric_session")
              payload = {
                  "profile": profile.dict() if profile else {},
                  "question": enriched_prompt,
                  "source": "fabric",
              }
              agents_client.messages.create(
                  thread_id=thread_id, role="user", content=json.dumps(payload)
              )

              event_handler = StreamingRetirementEventHandler(functions)
              with agents_client.runs.stream(
                  thread_id=thread_id, agent_id=agent.id, event_handler=event_handler
              ) as stream:
                  async def _process():
                      for _ in stream:
                          await asyncio.sleep(0.01)
                  task = asyncio.create_task(_process())
                  while not event_handler.is_complete:
                      try:
                          update = await asyncio.wait_for(event_handler.status_queue.get(), timeout=0.1)
                          yield f"data: {json.dumps(update)}\n\n"
                      except asyncio.TimeoutError:
                          pass
                      if task.done():
                          break
                  await task

              response_text = event_handler._accumulated_text
              # Parse analysis JSON from response (same logic as local path)
              try:
                  json_start = response_text.find('{')
                  json_end = response_text.rfind('}') + 1
                  if json_start != -1 and json_end > json_start:
                      json_str = response_text[json_start:json_end]
                      json_str = json_str.replace(',\n}', '\n}').replace(',\n]', '\n]')
                      analysis_dict = json.loads(json_str)
                      analysis_data = AnalysisOutput(**analysis_dict)
                      yield f"data: {json.dumps({'type': 'analysis', 'data': {'analysis': analysis_data.model_dump()}, 'timestamp': _t.time()})}\n\n"
                  else:
                      yield f"data: {json.dumps({'type': 'content', 'data': {'text': response_text}, 'timestamp': _t.time()})}\n\n"
              except Exception:
                  yield f"data: {json.dumps({'type': 'content', 'data': {'text': response_text}, 'timestamp': _t.time()})}\n\n"

          else:
              # No AI Agent — return raw Fabric result
              yield f"data: {json.dumps({'type': 'content', 'data': {'text': fabric_result.get('answer', '')}, 'timestamp': _t.time()})}\n\n"

          yield f"data: {json.dumps({'type': 'complete', 'data': {'source': 'fabric', 'fabric_data': fabric_result.get('data')}, 'timestamp': _t.time()})}\n\n"

      return StreamingResponse(
          fabric_generate_stream(),
          media_type="text/event-stream",
          headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
      )

  # ── Default local path (unchanged) ─────────────────────────────────────
  if not AGENT_AVAILABLE:
      raise HTTPException(
          status_code=503,
          detail="AI agent service is temporarily unavailable (tenant configuration issue). Please try again later."
      )
  try:
      profile = request.profile or SAMPLE_PROFILES[0]
      thread_id = thread_manager.get_or_create_thread("default_session")
      
      # Create message payload
      payload = {
          "profile": profile.dict(),
          "question": request.message
      }
      
      # Send message to thread
      agents_client.messages.create(
          thread_id=thread_id,
          role="user",
          content=json.dumps(payload)
      )
      
      # Build per-run MCP resources with the signed-in user's token so Work IQ
      # can access their M365 calendar and email data.
      user_token = http_request.headers.get("x-ms-token-aad-access-token")
      if user_token:
          run_tool_resources = ToolResources(mcp=[
              MCPToolResource(server_label="work_iq_copilot", headers={"Authorization": f"Bearer {user_token}"}, require_approval="never"),
              MCPToolResource(server_label="work_iq_calendar", headers={"Authorization": f"Bearer {user_token}"}, require_approval="never"),
          ])
          print("Work IQ: using user identity token for this run")
      else:
          run_tool_resources = None
          print("Work IQ: no user token available (SWA Linked Backend not connected?)")

      async def generate_stream():
          event_handler = StreamingRetirementEventHandler(functions)
          response_text = ""
          analysis_data = None

          # Start the streaming run
          with agents_client.runs.stream(
              thread_id=thread_id,
              agent_id=agent.id,
              event_handler=event_handler,
              tool_resources=run_tool_resources,
          ) as stream:
              
              # Process events in a separate task
              async def process_events():
                  for event in stream:
                      await asyncio.sleep(0.01)  # Small delay to allow queue processing
              
              # Start processing events
              event_task = asyncio.create_task(process_events())
              
              # Stream status updates only (no content streaming)
              while not event_handler.is_complete:
                  try:
                      # Check for status updates
                      status_update = await asyncio.wait_for(
                          event_handler.status_queue.get(), timeout=0.1
                      )
                      yield f"data: {json.dumps(status_update)}\n\n"
                  except asyncio.TimeoutError:
                      pass
                  
                  if event_task.done():
                      break
              
              # Wait for event processing to complete
              await event_task

              # Drain any remaining content/status events before sending complete
              while not event_handler.status_queue.empty():
                  try:
                      remaining = event_handler.status_queue.get_nowait()
                      yield f"data: {json.dumps(remaining)}\n\n"
                  except asyncio.QueueEmpty:
                      break

          # Send the conversational response directly
          response_text = event_handler._accumulated_text.strip()
          final_response = {
              "type": "complete",
              "data": {
                  "response": response_text,
                  "analysis": None,
                  "status": "completed",
                  "evaluation_context": {
                      "thread_id": thread_id,
                      "run_id": event_handler.run_id
                  } if event_handler.run_id else None
              },
              "timestamp": time.time()
          }
          yield f"data: {json.dumps(final_response)}\n\n"
      
      return StreamingResponse(
          generate_stream(),
          media_type="text/plain",
          headers={
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
              "Content-Type": "text/event-stream",
          }
      )
      
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
  """Non-streaming chat endpoint for compatibility"""
  if not AGENT_AVAILABLE:
      raise HTTPException(
          status_code=503,
          detail="AI agent service is temporarily unavailable (tenant configuration issue). Please try again later."
      )
  try:
      profile = request.profile or SAMPLE_PROFILES[0]
      thread_id = thread_manager.get_or_create_thread("default_session")
      
      # Create message payload
      payload = {
          "profile": profile.dict(),
          "question": request.message
      }
      
      # Send message to thread
      agents_client.messages.create(
          thread_id=thread_id,
          role="user",
          content=json.dumps(payload)
      )
      
      # Run the agent
      response_text = ""
      analysis_data = None
      
      class ResponseHandler(AgentEventHandler):
          def __init__(self):
              super().__init__()
              self.response = ""
          
          def on_message_delta(self, delta: MessageDeltaChunk):
              if delta.delta.content:
                  for chunk in delta.delta.content:
                      self.response += chunk.text.get("value", "")
          
          def on_thread_run(self, run: ThreadRun):
              if run.status == "completed":
                  pass  # Evaluation trigger removed for testing
              
              if run.status == "requires_action" and isinstance(run.required_action, SubmitToolOutputsAction):
                  tool_calls = run.required_action.submit_tool_outputs.tool_calls
                  tool_outputs = []
                  
                  for tool_call in tool_calls:
                      if tool_call.function.name == "get_product_catalogue":
                          args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
                          risk = args.get("risk", "medium")
                          result = get_product_catalogue(risk)
                          
                          tool_outputs.append(ToolOutput(
                              tool_call_id=tool_call.id,
                              output=result
                          ))
                  
                  if tool_outputs:
                      agents_client.runs.submit_tool_outputs_stream(
                          thread_id=run.thread_id,
                          run_id=run.id,
                          tool_outputs=tool_outputs,
                          event_handler=self
                      )
      
      handler = ResponseHandler()
      
      with agents_client.runs.stream(
          thread_id=thread_id,
          agent_id=agent.id,
          event_handler=handler
      ) as stream:
          for event in stream:
              pass
      
      response_text = handler.response
      
      return ChatResponse(
          response=response_text,
          analysis=None,
          status="completed"
      )
      
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))


# ─── Scenario Projection Endpoint ────────────────────────────────────────────

class ProjectedAccount(BaseModel):
    id: str
    name: str
    current_value: float
    projected_value: float
    change: float
    change_percent: float

class ProjectedHolding(BaseModel):
    symbol: str
    name: str
    current_value: float
    projected_value: float
    current_allocation: float
    projected_allocation: float
    change: float
    change_percent: float

class ProjectionAssumptions(BaseModel):
    market_return_annual: float
    inflation_rate: float
    contribution_limit_401k: int
    contribution_limit_ira: int

class ProjectionResult(BaseModel):
    total_value: float
    total_change: float
    total_change_percent: float
    accounts: List[ProjectedAccount]
    holdings: List[ProjectedHolding]

class ScenarioRisk(BaseModel):
    title: str
    detail: str
    severity: str  # high, medium, low

class ScenarioOpportunity(BaseModel):
    title: str
    detail: str
    impact: str  # high, medium, low

class ScenarioActionItem(BaseModel):
    action: str
    priority: str  # high, medium, low
    category: str  # contribution, allocation, tax, planning

class ScenarioProjectionRequest(BaseModel):
    profile_id: str
    scenario_description: str
    timeframe_months: int = Field(ge=1, le=60)
    current_portfolio: Dict[str, Any]
    data_source: Optional[str] = None  # "local" (default) or "fabric"

class ScenarioProjectionResponse(BaseModel):
    projection: ProjectionResult
    assumptions: ProjectionAssumptions
    summary: str
    headline: Optional[str] = None
    risks: Any  # List[str] or List[ScenarioRisk]
    opportunities: Any  # List[str] or List[ScenarioOpportunity]
    action_items: Optional[List[ScenarioActionItem]] = None
    key_factors: Optional[List[str]] = None

SCENARIO_PROJECTION_PROMPT = """
You are a financial projection analyst. Your task is to analyze a user's portfolio and project future values based on a described scenario.

IMPORTANT: You must respond with ONLY a valid JSON object. No explanatory text before or after.

Given:
- Current portfolio value: ${total_value:,.0f}
- Scenario: {scenario}
- Timeframe: {timeframe_months} months
- User Profile: {profile_summary}

Current Accounts:
{accounts_summary}

Current Holdings:
{holdings_summary}

Analyze this scenario and provide projections. Consider:
1. Realistic market returns (historical average ~7% annually for diversified portfolios)
2. Impact of contribution changes on portfolio growth
3. Inflation (assume 2.5% annually)
4. 2026 contribution limits: 401(k) = $23,000, IRA = $7,000
5. Risk factors specific to the scenario
6. Compound growth over the timeframe

Calculate projected values for EACH account and holding based on:
- Base market return adjusted for scenario
- Additional contributions if scenario involves increased savings
- Reallocation effects if portfolio changes mentioned
- Timeframe-proportional growth ({timeframe_months}/12 of annual return)

CRITICAL: Your response must be a single JSON object with this exact structure:
{{
  "projection": {{
    "total_value": <number - projected total portfolio value>,
    "total_change": <number - change from current value (positive or negative)>,
    "total_change_percent": <number - percentage change>,
    "accounts": [
      {{
        "id": "<account id>",
        "name": "<account name>",
        "current_value": <number>,
        "projected_value": <number>,
        "change": <number>,
        "change_percent": <number>
      }}
    ],
    "holdings": [
      {{
        "symbol": "<ticker>",
        "name": "<holding name>",
        "current_value": <number>,
        "projected_value": <number>,
        "current_allocation": <number - percentage>,
        "projected_allocation": <number - percentage>,
        "change": <number>,
        "change_percent": <number>
      }}
    ]
  }},
  "assumptions": {{
    "market_return_annual": 0.07,
    "inflation_rate": 0.025,
    "contribution_limit_401k": 23000,
    "contribution_limit_ira": 7000
  }},
  "headline": "<Short 5-8 word headline summarizing the scenario outcome>",
  "summary": "<2-3 sentence explanation of projection results>",
  "key_factors": [
    "<key factor 1 driving this projection - keep under 10 words>",
    "<key factor 2>",
    "<key factor 3>"
  ],
  "risks": [
    {{
      "title": "<Short risk title, 3-6 words>",
      "detail": "<1-2 sentence explanation of this risk>",
      "severity": "high" | "medium" | "low"
    }}
  ],
  "opportunities": [
    {{
      "title": "<Short opportunity title, 3-6 words>",
      "detail": "<1-2 sentence explanation of this opportunity>",
      "impact": "high" | "medium" | "low"
    }}
  ],
  "action_items": [
    {{
      "action": "<Specific actionable step the user should take>",
      "priority": "high" | "medium" | "low",
      "category": "contribution" | "allocation" | "tax" | "planning"
    }}
  ]
}}

Provide 2-4 risks, 2-4 opportunities, 2-4 action_items, and 2-4 key_factors.
Be specific with numbers. All monetary values should be rounded to nearest dollar.
Percentages should have 1-2 decimal places.
Account for the specific timeframe - don't use full annual returns for shorter periods.
"""

@app.post("/api/project-scenario", response_model=ScenarioProjectionResponse)
async def project_scenario(request: ScenarioProjectionRequest):
    """Project portfolio changes based on a described scenario using AI analysis"""
    use_fabric = (request.data_source == "fabric")

    # ── Fabric-enriched scenario projection ──────────────────────────────
    if use_fabric:
        if not FABRIC_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Fabric Data Agent is not configured.",
            )
        # Ask Fabric for the latest client portfolio data
        fabric_question = (
            f"Get the full portfolio breakdown for profile {request.profile_id}: "
            f"accounts, holdings, total value, and risk appetite."
        )
        try:
            fabric_result = await fabric_client.query(fabric_question, timeout=60)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Fabric query failed: {e}")

        # Merge Fabric data with the request's current_portfolio
        fabric_portfolio = fabric_result.get("data") or {}
        if isinstance(fabric_portfolio, list) and len(fabric_portfolio) > 0:
            fabric_portfolio = fabric_portfolio[0] if isinstance(fabric_portfolio[0], dict) else {}
        merged_portfolio = {**request.current_portfolio}
        if isinstance(fabric_portfolio, dict):
            merged_portfolio.update(fabric_portfolio)

        # Continue with the normal projection flow using merged data
        request_dict = request.model_dump()
        request_dict["current_portfolio"] = merged_portfolio
        request_dict["data_source"] = "local"  # prevent recursion
        merged_request = ScenarioProjectionRequest(**request_dict)
        return await project_scenario(merged_request)

    # ── Default local projection (unchanged) ─────────────────────────────
    try:
        # Find the profile
        profile = next(
            (p for p in SAMPLE_PROFILES if p.id == request.profile_id),
            SAMPLE_PROFILES[0] if SAMPLE_PROFILES else None
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Build context for the prompt
        total_value = request.current_portfolio.get("total_value", 0)
        accounts = request.current_portfolio.get("accounts", [])
        holdings = request.current_portfolio.get("holdings", [])
        
        accounts_summary = "\n".join([
            f"- {a.get('name', 'Unknown')}: ${a.get('balance', 0):,.0f}"
            for a in accounts
        ])
        
        holdings_summary = "\n".join([
            f"- {h.get('symbol', 'UNK')} ({h.get('name', 'Unknown')}): ${h.get('value', 0):,.0f} ({h.get('allocation', 0)}%)"
            for h in holdings
        ])
        
        profile_summary = f"Age {profile.age}, salary ${profile.salary:,.0f}, {profile.risk_appetite} risk tolerance, targeting retirement at {profile.target_retire_age}"
        
        # Format the prompt
        formatted_prompt = SCENARIO_PROJECTION_PROMPT.format(
            total_value=total_value,
            scenario=request.scenario_description,
            timeframe_months=request.timeframe_months,
            profile_summary=profile_summary,
            accounts_summary=accounts_summary or "No accounts provided",
            holdings_summary=holdings_summary or "No holdings provided"
        )
        
        # Create a thread and run the projection
        thread = agents_client.threads.create()
        
        agents_client.messages.create(
            thread_id=thread.id,
            role="user",
            content=formatted_prompt
        )
        
        # Run with streaming to capture response
        class ProjectionHandler(AgentEventHandler):
            def __init__(self):
                super().__init__()
                self.response = ""
            
            def on_message_delta(self, delta: MessageDeltaChunk):
                if delta.delta.content:
                    for chunk in delta.delta.content:
                        self.response += chunk.text.get("value", "")
            
            def on_thread_run(self, run: ThreadRun):
                pass  # No tool calls needed for projections
        
        handler = ProjectionHandler()
        
        with agents_client.runs.stream(
            thread_id=thread.id,
            agent_id=agent.id,
            event_handler=handler
        ) as stream:
            for event in stream:
                pass
        
        response_text = handler.response.strip()
        
        # Parse JSON from response
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start == -1 or json_end <= json_start:
            raise HTTPException(status_code=500, detail="Failed to parse projection response")
        
        json_str = response_text[json_start:json_end]
        projection_data = json.loads(json_str)
        
        # Validate and return
        return ScenarioProjectionResponse(**projection_data)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse projection JSON: {str(e)}")
    except ValidationError as e:
        raise HTTPException(status_code=500, detail=f"Invalid projection format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Projection failed: {str(e)}")


@app.get("/scenarios")
async def get_quick_scenarios():
  """Get predefined quick scenario questions"""
  return {
      "scenarios": [
          "What if I retire 2 years earlier?",
          "How would a market crash affect my plan?",
          "Should I increase my savings rate by 5%?",
          "What if I need $100k for healthcare costs?",
          "How does inflation impact my retirement income?",
          "What if I work part-time in retirement?",
          "Should I pay off my mortgage before retiring?",
          "What if I inherit $200k from my parents?",
          "How would changing jobs affect my retirement?",
          "What if I want to retire abroad?",
      ]
  }


# ─── Conversation Storage Endpoints ──────────────────────────────────────────

class SaveConversationRequest(BaseModel):
    """Request to save a conversation."""
    user_id: str
    conversation_id: Optional[str] = None
    title: str = "New Conversation"
    messages: List[Dict[str, Any]]


class AddMessageRequest(BaseModel):
    """Request to add a message to a conversation."""
    role: str  # "user" or "assistant"
    content: str


@app.get("/api/conversations/{user_id}")
async def list_user_conversations(user_id: str):
    """List all conversations for a user."""
    conversations = await storage.list_conversations(user_id)
    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "message_count": len(c.messages),
                "created_at": c.created_at,
                "updated_at": c.updated_at,
                "preview": c.messages[-1].content[:100] if c.messages else ""
            }
            for c in conversations
        ]
    }


@app.get("/api/conversations/{user_id}/{conversation_id}")
async def get_conversation(user_id: str, conversation_id: str):
    """Get a specific conversation with all messages."""
    conversation = await storage.get_conversation(user_id, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation.model_dump()


@app.post("/api/conversations/{user_id}")
async def create_conversation(user_id: str, request: SaveConversationRequest):
    """Create a new conversation."""
    messages = [
        ConversationMessage(
            role=m.get("role", "user"),
            content=m.get("content", ""),
            timestamp=m.get("timestamp", datetime.utcnow().isoformat())
        )
        for m in request.messages
    ]
    
    conversation = Conversation(
        user_id=user_id,
        title=request.title,
        messages=messages
    )
    
    conversation_id = await storage.save_conversation(conversation)
    return {"id": conversation_id, "message": "Conversation created"}


@app.put("/api/conversations/{user_id}/{conversation_id}")
async def update_conversation(user_id: str, conversation_id: str, request: SaveConversationRequest):
    """Update an existing conversation."""
    existing = await storage.get_conversation(user_id, conversation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = [
        ConversationMessage(
            id=m.get("id", str(uuid.uuid4()) if 'uuid' in dir() else ""),
            role=m.get("role", "user"),
            content=m.get("content", ""),
            timestamp=m.get("timestamp", datetime.utcnow().isoformat())
        )
        for m in request.messages
    ]
    
    existing.title = request.title
    existing.messages = messages
    
    await storage.save_conversation(existing)
    return {"id": conversation_id, "message": "Conversation updated"}


@app.post("/api/conversations/{user_id}/{conversation_id}/messages")
async def add_message_to_conversation(user_id: str, conversation_id: str, request: AddMessageRequest):
    """Add a message to an existing conversation."""
    conversation = await storage.get_conversation(user_id, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    message = ConversationMessage(
        role=request.role,
        content=request.content
    )
    conversation.messages.append(message)
    
    await storage.save_conversation(conversation)
    return {"message_id": message.id, "message": "Message added"}


@app.delete("/api/conversations/{user_id}/{conversation_id}")
async def delete_conversation(user_id: str, conversation_id: str):
    """Delete a conversation."""
    success = await storage.delete_conversation(user_id, conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted"}


# ─── Scenario Storage Endpoints ──────────────────────────────────────────────

class SaveScenarioRequest(BaseModel):
    """Request to save a scenario."""
    name: str
    description: str
    timeframe_months: int
    projection_result: Dict[str, Any]


class ScenarioConsentRequest(BaseModel):
    """Request to record user consent for advisor scenario review."""
    advisor_id: Optional[str] = None
    scenario_description: str
    analysis_payload: Dict[str, Any] = Field(default_factory=dict)
    consent_status: str  # "accepted" | "rejected"


def _resolve_advisor_id_for_user(user_id: str, fallback_advisor_id: Optional[str] = None) -> Optional[str]:
    """Resolve advisor_id from user profile JSON with optional fallback."""
    if fallback_advisor_id:
        return fallback_advisor_id
    try:
        with open(DATA_DIR / "user_profiles.json", "r", encoding="utf-8") as f:
            profiles = json.load(f)
        for profile in profiles:
            if profile.get("id") == user_id:
                return profile.get("advisor_id")
    except Exception:
        pass
    return None


def _map_share_to_advisor_scenario(record: ScenarioShareRecord) -> Dict[str, Any]:
    """Map a share record into advisor UI scenario card shape."""
    analysis = record.analysis_payload or {}
    predictions = analysis.get("predictions") or {}
    metrics = predictions.get("metrics") or {}
    deltas = predictions.get("deltas") or {}
    cashflows = predictions.get("cashflows") or []

    success_rate_pct = metrics.get("success_rate_pct")
    current_success_pct = None
    if success_rate_pct is not None and deltas.get("success_rate_delta_pct") is not None:
        current_success_pct = success_rate_pct - deltas.get("success_rate_delta_pct")

    final_balance = None
    if isinstance(cashflows, list) and len(cashflows) > 0:
        final_balance = cashflows[-1].get("end_assets")

    impact = "neutral"
    success_delta = deltas.get("success_rate_delta_pct")
    if isinstance(success_delta, (int, float)):
        if success_delta > 0:
            impact = "positive"
        elif success_delta < 0:
            impact = "negative"

    recommendation = analysis.get("considerations") or "Client requested advisor review for this scenario analysis."

    return {
        "id": record.id,
        "name": "Client-shared scenario review",
        "description": record.scenario_description,
        "created_at": record.created_at,
        "run_by": "client",
        "impact": impact,
        "recommendation": recommendation,
        "projection_result": {
            "success_probability": (success_rate_pct / 100.0) if isinstance(success_rate_pct, (int, float)) else 0,
            "final_balance": final_balance if isinstance(final_balance, (int, float)) else 0,
            "monthly_income": metrics.get("monthly_income"),
            "current_success_probability": (current_success_pct / 100.0)
            if isinstance(current_success_pct, (int, float))
            else None,
        },
        "escalation_id": record.escalation_id,
    }


@app.post("/api/scenario-consent/{user_id}")
async def submit_scenario_consent(user_id: str, request: ScenarioConsentRequest):
    """Persist consent decision and create an advisor escalation on acceptance."""
    consent_status = (request.consent_status or "").strip().lower()
    if consent_status not in {"accepted", "rejected"}:
        raise HTTPException(status_code=400, detail="consent_status must be 'accepted' or 'rejected'")

    advisor_id = _resolve_advisor_id_for_user(user_id, request.advisor_id)
    if not advisor_id:
        raise HTTPException(status_code=400, detail="No advisor assigned to user")

    escalation_id = None
    if consent_status == "accepted":
        escalation = EscalationTicket(
            client_id=user_id,
            advisor_id=advisor_id,
            reason=EscalationReason.USER_REQUESTED,
            context_summary=(
                "Client consented to share a complex scenario analysis and requested advisor review "
                "for follow-up discussion."
            ),
            client_question=request.scenario_description,
            priority=EscalationPriority.MEDIUM,
        )
        escalation_id = await _advisor_store.save_escalation(escalation)

    record = ScenarioShareRecord(
        user_id=user_id,
        advisor_id=advisor_id,
        scenario_description=request.scenario_description,
        analysis_payload=request.analysis_payload or {},
        consent_status=consent_status,
        escalation_id=escalation_id,
    )
    record_id = await storage.save_scenario_share(record)

    return {
        "id": record_id,
        "consent_status": consent_status,
        "advisor_id": advisor_id,
        "escalation_id": escalation_id,
    }


@app.get("/api/shared-scenarios/{advisor_id}/{client_id}")
async def get_shared_scenarios_for_advisor(advisor_id: str, client_id: str):
    """Return client scenarios shared with advisor by explicit user consent."""
    records = await storage.list_scenario_shares(
        user_id=client_id,
        advisor_id=advisor_id,
        consent_status="accepted",
    )
    return {"scenarios": [_map_share_to_advisor_scenario(r) for r in records]}


@app.get("/api/saved-scenarios/{user_id}")
async def list_user_scenarios(user_id: str):
    """List all saved scenarios for a user."""
    scenarios = await storage.list_scenarios(user_id)
    return {
        "scenarios": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "timeframe_months": s.timeframe_months,
                "created_at": s.created_at,
                "total_change_percent": s.projection_result.get("projection", {}).get("total_change_percent", 0)
            }
            for s in scenarios
        ]
    }


@app.get("/api/saved-scenarios/{user_id}/{scenario_id}")
async def get_saved_scenario(user_id: str, scenario_id: str):
    """Get a specific saved scenario with full projection data."""
    scenario = await storage.get_scenario(user_id, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario.model_dump()


@app.post("/api/saved-scenarios/{user_id}")
async def save_scenario(user_id: str, request: SaveScenarioRequest):
    """Save a new scenario."""
    scenario = SavedScenario(
        user_id=user_id,
        name=request.name,
        description=request.description,
        timeframe_months=request.timeframe_months,
        projection_result=request.projection_result
    )
    
    scenario_id = await storage.save_scenario(scenario)
    return {"id": scenario_id, "message": "Scenario saved"}


@app.delete("/api/saved-scenarios/{user_id}/{scenario_id}")
async def delete_saved_scenario(user_id: str, scenario_id: str):
    """Delete a saved scenario."""
    success = await storage.delete_scenario(user_id, scenario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"message": "Scenario deleted"}


