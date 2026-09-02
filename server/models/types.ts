/**
 * Defines the provider-neutral contract for streaming generated text. Provider adapters satisfy this interface so domain services do not depend on a vendor SDK.
 */
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
