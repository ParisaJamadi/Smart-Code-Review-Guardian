export const db = {
  query: async (sql, params) => [{ id: params[0], name: "from-db" }],
};
