from azure.identity import AzureCliCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition, A2APreviewTool

PROJECT_ENDPOINT = "https://finance-app-5726-resource.services.ai.azure.com/api/projects/finance-app-5726"
AGENT_NAME = "finance-app-5726-omni-agent"
CONNECTION_NAME = "financialsagent23-connection"

project = AIProjectClient(endpoint=PROJECT_ENDPOINT, credential=AzureCliCredential())

a2a_connection = project.connections.get(CONNECTION_NAME)

agent = project.agents.create_version(
    agent_name=AGENT_NAME,
    definition=PromptAgentDefinition(
        model="gpt-4.1",
        instructions=(
            "You are Omni, an AI assistant at Woodgrove Financial. "
            "You have access to a connected agent called FinancialsAgent23 that has detailed knowledge of "
            "institutional client portfolios, market events, IC positioning, and compliance policies for "
            "Woodgrove Financial. Always delegate to FinancialsAgent23 when answering questions about "
            "clients, portfolios, market conditions, sector allocations, or compliance. "
            "Do not attempt to answer these questions from your own knowledge — always use the connected agent."
        ),
        tools=[A2APreviewTool(project_connection_id=a2a_connection.id)],
    ),
)
print(f"Agent updated: {agent.name} v{agent.version}")
