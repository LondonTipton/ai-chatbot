-- Create a new user for the chatbot
CREATE USER chatbot_user WITH PASSWORD 'chatbot123';

-- Create the database
CREATE DATABASE aichatbot OWNER chatbot_user;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE aichatbot TO chatbot_user;
