import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{ readonly name: string }>`
    SELECT name FROM pragma_table_info('projection_thread_messages')
  `;
  if (!columns.some((column) => column.name === "async_user_input_json")) {
    yield* sql`
      ALTER TABLE projection_thread_messages
      ADD COLUMN async_user_input_json TEXT
    `;
  }
});
