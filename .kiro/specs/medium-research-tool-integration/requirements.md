# Requirements Document

## Introduction

This feature integrates the existing Advanced Search Workflow as a tool that the Chat Agent can invoke for research-intensive queries. Instead of having separate routes and UI for research, the research capability becomes an extension of the chat system through workflow-based tools. The Advanced Search Workflow executes deterministically (search → extract → synthesize) and returns complete results in a single tool call, avoiding nested agent tool call problems.

## Glossary

- **Chat Agent**: The primary conversational agent that handles user interactions and orchestrates other capabilities
- **Advanced Search Workflow**: A Mastra workflow that performs comprehensive legal research through deterministic steps (search → extract → synthesize) with 4K-8K token budget
- **Workflow Tool**: A Mastra tool wrapper that exposes a workflow's capabilities to an agent, allowing the workflow to be invoked as a single tool call
- **Tool Invocation**: When the Chat Agent calls a workflow tool to perform research operations
- **Streaming Response**: Real-time delivery of research results through the chat UI as they are generated
- **Chat UI**: The existing message rendering system including messages.tsx, artifact.tsx, and related components
- **Mastra Workflow**: A structured sequence of deterministic steps that execute tools directly without LLM decision-making at each step

## Requirements

### Requirement 1

**User Story:** As a user, I want to ask research questions in the chat interface and have the system automatically perform comprehensive research, so that I get thorough answers without switching to a different interface.

#### Acceptance Criteria

1. WHEN a user sends a message requiring research, THE Chat Agent SHALL invoke the Advanced Search Workflow tool
2. WHILE the research is in progress, THE Chat UI SHALL display a tool invocation indicator showing "Using tool: advanced-search-workflow"
3. WHEN the Advanced Search Workflow completes, THE Chat Agent SHALL receive a complete synthesized response with sources
4. THE Chat UI SHALL render research results using the existing message and artifact components
5. WHERE the user requests document creation, THE Chat Agent SHALL invoke the createDocument tool separately after receiving research results

### Requirement 2

**User Story:** As a developer, I want the Advanced Search Workflow to be wrapped as a Mastra tool, so that it can be invoked by the Chat Agent without nested tool call problems.

#### Acceptance Criteria

1. THE system SHALL create a Mastra tool definition that wraps the existing Advanced Search Workflow
2. THE workflow tool SHALL accept query and jurisdiction as input parameters
3. WHEN invoked, THE workflow tool SHALL execute the workflow steps deterministically without agent decision-making
4. THE workflow tool SHALL return a complete synthesized response with sources and token usage in a single tool call
5. THE workflow tool SHALL handle errors gracefully at each step and return partial results when possible

### Requirement 3

**User Story:** As a user, I want the chat agent to intelligently decide when to use research capabilities, so that simple questions get quick answers while complex queries trigger comprehensive research.

#### Acceptance Criteria

1. THE Chat Agent SHALL be configured with the Advanced Search Workflow tool in its tool registry
2. THE Chat Agent's instructions SHALL include guidance on when to invoke the workflow tool versus answering directly
3. WHEN a user asks a simple question, THE Chat Agent SHALL respond directly without invoking the workflow
4. WHEN a user asks a complex legal question requiring multiple sources, THE Chat Agent SHALL invoke the Advanced Search Workflow tool
5. THE Chat Agent SHALL use only 1 step to invoke the workflow tool, receiving a complete response in return

### Requirement 4

**User Story:** As a user, I want research results to appear seamlessly in my chat conversation, so that I have a consistent experience regardless of whether research was performed.

#### Acceptance Criteria

1. THE system SHALL stream research results through the existing chat API route
2. THE Chat UI SHALL render tool invocation states using existing message components
3. WHERE research creates documents, THE system SHALL save them to the database with proper user association
4. THE Chat UI SHALL display research-generated documents as artifacts in the message stream
5. THE system SHALL maintain chat history including both user queries and research results

### Requirement 5

**User Story:** As a developer, I want to consolidate research functionality into the chat route, so that we have a single code path for all AI interactions.

#### Acceptance Criteria

1. THE system SHALL route medium complexity queries through the chat API endpoint using the Chat Agent with workflow tools
2. THE system SHALL NOT require a separate research route for medium complexity queries
3. THE existing chat route SHALL handle both simple chat and research-enhanced responses through the Chat Agent
4. THE system SHALL use the existing complexity detection to route medium queries to Mastra with the Chat Agent
5. THE Chat Agent SHALL use the Advanced Search Workflow tool for research needs, avoiding nested agent tool calls
