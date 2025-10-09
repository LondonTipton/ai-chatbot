const { config } = require("dotenv");
const postgres = require("postgres");

// Load environment variables from .env.local
config({ path: ".env.local" });

// Update the connection string to not include a password
const databaseUrl = "postgresql://postgres@127.0.0.1:5432/aichatbot";
console.log("Testing database connection with URL:", databaseUrl);

async function testConnection() {
  try {
    console.log("✅ Attempting to connect to database...");

    // Create database client
    const client = postgres(databaseUrl);

    // Test the connection
    const result = await client`SELECT current_database(), current_user`;
    console.log("✅ Database connection successful!");
    console.log("Database:", result[0].current_database);
    console.log("User:", result[0].current_user);

    // Close the connection
    await client.end();
    console.log("✅ Connection closed successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
}

testConnection();
