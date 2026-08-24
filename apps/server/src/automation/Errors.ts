import { ProviderExecutionCapabilityReason } from "@omnimind/contracts";
import { Schema } from "effect";

export class AutomationServiceError extends Schema.TaggedErrorClass<AutomationServiceError>()(
  "AutomationServiceError",
  {
    message: Schema.String,
    code: Schema.optional(
      Schema.Union([
        Schema.Literal("AUTOMATION_DEFINITION_CONFLICT"),
        ProviderExecutionCapabilityReason,
      ]),
    ),
    cause: Schema.optional(Schema.Defect),
  },
) {}
