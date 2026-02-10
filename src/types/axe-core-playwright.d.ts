// Type shim when @axe-core/playwright is not installed.
declare module '@axe-core/playwright' {
  export class AxeBuilder {
    constructor(options: { page: unknown });
    include(selector: string): AxeBuilder;
    exclude(selector: string): AxeBuilder;
    withTags(tags: string[]): AxeBuilder;
    configure(config: { rules?: Record<string, { enabled: boolean }> }): AxeBuilder;
    analyze(): Promise<{
      violations: Array<{
        id: string;
        impact?: string | null;
        description?: string;
        help?: string;
        helpUrl?: string;
        nodes?: Array<{ target: string[]; html?: string; failureSummary?: string }>;
      }>;
    }>;
  }
}
