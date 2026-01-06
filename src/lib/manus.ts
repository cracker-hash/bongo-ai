// Wiser AI Automation Library
// Agent loop: Analyze → Think → Select → Execute → Observe

export interface ManusTask {
  id: string;
  type: 'browser' | 'code' | 'api' | 'file' | 'custom';
  action: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface ManusAgent {
  id: string;
  name: string;
  tasks: ManusTask[];
  phase: 'analyze' | 'think' | 'select' | 'execute' | 'observe' | 'complete';
  context: Record<string, any>;
  checkpoints: ManusCheckpoint[];
}

export interface ManusCheckpoint {
  id: string;
  timestamp: number;
  phase: string;
  state: Record<string, any>;
}

export interface ManusToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: Record<string, any>) => Promise<any>;
}

// Built-in tools
export const manusTools: ManusToolDefinition[] = [
  {
    name: 'web_search',
    description: 'Search the web for information',
    parameters: { query: 'string' },
    execute: async (params) => {
      // Simulated web search - in production, integrate with search API
      return { results: [`Results for: ${params.query}`] };
    }
  },
  {
    name: 'browse_url',
    description: 'Navigate to a URL and extract content',
    parameters: { url: 'string' },
    execute: async (params) => {
      return { content: `Content from: ${params.url}` };
    }
  },
  {
    name: 'generate_code',
    description: 'Generate code for a specific task',
    parameters: { language: 'string', description: 'string' },
    execute: async (params) => {
      return { code: `// Generated ${params.language} code\n// ${params.description}` };
    }
  },
  {
    name: 'create_file',
    description: 'Create a new file with content',
    parameters: { path: 'string', content: 'string' },
    execute: async (params) => {
      return { success: true, path: params.path };
    }
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command',
    parameters: { command: 'string' },
    execute: async (params) => {
      return { output: `Executed: ${params.command}` };
    }
  }
];

// Agent loop implementation
export class ManusAgentRunner {
  private agent: ManusAgent;
  private onPhaseChange?: (phase: string) => void;
  private onTaskUpdate?: (task: ManusTask) => void;

  constructor(
    name: string,
    options?: {
      onPhaseChange?: (phase: string) => void;
      onTaskUpdate?: (task: ManusTask) => void;
    }
  ) {
    this.agent = {
      id: crypto.randomUUID(),
      name,
      tasks: [],
      phase: 'analyze',
      context: {},
      checkpoints: []
    };
    this.onPhaseChange = options?.onPhaseChange;
    this.onTaskUpdate = options?.onTaskUpdate;
  }

  private createCheckpoint() {
    const checkpoint: ManusCheckpoint = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      phase: this.agent.phase,
      state: { ...this.agent.context }
    };
    this.agent.checkpoints.push(checkpoint);
    return checkpoint;
  }

  rollback(checkpointId: string) {
    const checkpoint = this.agent.checkpoints.find(c => c.id === checkpointId);
    if (checkpoint) {
      this.agent.context = { ...checkpoint.state };
      this.agent.phase = checkpoint.phase as any;
      return true;
    }
    return false;
  }

  async analyze(input: string): Promise<{ goal: string; subTasks: string[] }> {
    this.agent.phase = 'analyze';
    this.onPhaseChange?.('analyze');
    this.createCheckpoint();

    // In production, use AI to analyze the input
    const goal = input;
    const subTasks = [
      'Understand requirements',
      'Gather necessary information',
      'Plan execution steps',
      'Execute tasks',
      'Verify results'
    ];

    this.agent.context.goal = goal;
    this.agent.context.subTasks = subTasks;

    return { goal, subTasks };
  }

  async think(): Promise<{ plan: string[]; selectedTools: string[] }> {
    this.agent.phase = 'think';
    this.onPhaseChange?.('think');
    this.createCheckpoint();

    // In production, use AI to create a plan
    const plan = this.agent.context.subTasks || [];
    const selectedTools = ['web_search', 'generate_code', 'create_file'];

    this.agent.context.plan = plan;
    this.agent.context.selectedTools = selectedTools;

    return { plan, selectedTools };
  }

  async select(): Promise<ManusTask[]> {
    this.agent.phase = 'select';
    this.onPhaseChange?.('select');
    this.createCheckpoint();

    const tasks: ManusTask[] = (this.agent.context.selectedTools || []).map((tool: string, i: number) => ({
      id: crypto.randomUUID(),
      type: 'custom' as const,
      action: tool,
      params: {},
      status: 'pending' as const
    }));

    this.agent.tasks = tasks;
    return tasks;
  }

  async execute(): Promise<ManusTask[]> {
    this.agent.phase = 'execute';
    this.onPhaseChange?.('execute');
    this.createCheckpoint();

    for (const task of this.agent.tasks) {
      task.status = 'running';
      this.onTaskUpdate?.(task);

      try {
        const tool = manusTools.find(t => t.name === task.action);
        if (tool) {
          task.result = await tool.execute(task.params);
          task.status = 'completed';
        } else {
          task.error = `Tool not found: ${task.action}`;
          task.status = 'failed';
        }
      } catch (error) {
        task.error = error instanceof Error ? error.message : 'Unknown error';
        task.status = 'failed';
      }

      this.onTaskUpdate?.(task);
    }

    return this.agent.tasks;
  }

  async observe(): Promise<{ success: boolean; summary: string }> {
    this.agent.phase = 'observe';
    this.onPhaseChange?.('observe');
    this.createCheckpoint();

    const completedTasks = this.agent.tasks.filter(t => t.status === 'completed');
    const failedTasks = this.agent.tasks.filter(t => t.status === 'failed');

    const success = failedTasks.length === 0;
    const summary = success
      ? `Successfully completed ${completedTasks.length} tasks`
      : `Completed ${completedTasks.length} tasks, ${failedTasks.length} failed`;

    this.agent.phase = 'complete';
    this.onPhaseChange?.('complete');

    return { success, summary };
  }

  async run(input: string): Promise<{ success: boolean; summary: string; tasks: ManusTask[] }> {
    await this.analyze(input);
    await this.think();
    await this.select();
    await this.execute();
    const { success, summary } = await this.observe();

    return { success, summary, tasks: this.agent.tasks };
  }

  getAgent() {
    return this.agent;
  }

  getCheckpoints() {
    return this.agent.checkpoints;
  }
}

// Helper function to create automation workflows
export function createAutomationWorkflow(name: string, steps: Array<{
  tool: string;
  params: Record<string, any>;
}>) {
  return {
    name,
    steps,
    async execute(runner: ManusAgentRunner) {
      const tasks: ManusTask[] = steps.map((step, i) => ({
        id: crypto.randomUUID(),
        type: 'custom',
        action: step.tool,
        params: step.params,
        status: 'pending' as const
      }));
      return tasks;
    }
  };
}
