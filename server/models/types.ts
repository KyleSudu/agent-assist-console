export type TextPrompt = {
  instructions: string;
  input: string;
};

export type StreamTextOptions = {
  signal: AbortSignal;
};

export interface StreamingTextModel {
  stream(prompt: TextPrompt, options: StreamTextOptions): AsyncIterable<string>;
}
