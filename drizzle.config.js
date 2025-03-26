/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./utils/schema.jsx",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_d3N1HTjgzJYi@ep-summer-wildflower-a5845wdx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
  },
};
