export type DemoEventKind =
  | 'status'
  | 'text'
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'file_op'
  | 'todo'
  | 'artifact_ready'
  | 'usage'
  | 'error'
  | 'done';

export interface DemoStreamEvent {
  id: number;
  kind: DemoEventKind;
  ts: number;
  data: Record<string, any>;
}
