import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const TechnicalDocumentationTemplate: MarkdownTemplate = {
  filename: "technical-documentation",
  frontMatter: {
    title: "Technical Documentation",
    description: `A comprehensive template for creating technical documentation including API docs, setup guides, and system documentation.`,
    tags: "technical,documentation,api,setup,guide",
  },
  content: `# 📚 Technical Documentation

**Document Title:** [Document Name]

**Version:** [1.0]

**Last Updated:** ${date}

**Author:** [Your Name]

**Reviewer:** [Reviewer Name]

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)
8. [Examples](#examples)

---

## 🎯 Overview
**Purpose:** [What this system/API does]
**Scope:** [What is covered in this documentation]
**Target Audience:** [Who should read this documentation]

### Key Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

---

## ✅ Prerequisites
### System Requirements
- **Operating System:** [OS requirements]
- **Runtime:** [Node.js, Python, etc.]
- **Database:** [Database requirements]
- **Memory:** [RAM requirements]
- **Storage:** [Disk space requirements]

### Dependencies
- [Dependency 1] - [Version]
- [Dependency 2] - [Version]
- [Dependency 3] - [Version]

### Accounts & Permissions
- [Account/Service 1] - [Required permissions]
- [Account/Service 2] - [Required permissions]

---

## 🚀 Installation

### Step 1: Clone the Repository
\`\`\`bash
git clone [repository-url]
cd [project-name]
\`\`\`

### Step 2: Install Dependencies
\`\`\`bash
npm install
# or
yarn install
\`\`\`

### Step 3: Environment Setup
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

### Step 4: Database Setup
\`\`\`bash
npm run db:migrate
npm run db:seed
\`\`\`

### Step 5: Start the Application
\`\`\`bash
npm run dev
\`\`\`

---

## ⚙️ Configuration

### Environment Variables
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| \`DATABASE_URL\` | Database connection string | - | Yes |
| \`API_KEY\` | API authentication key | - | Yes |
| \`PORT\` | Server port | 3000 | No |

### Configuration Files
- **config/database.yml** - Database configuration
- **config/app.yml** - Application settings
- **config/api.yml** - API configuration

---

## 📖 Usage

### Basic Usage
\`\`\`javascript
// Example code
const api = new API({
  baseURL: 'https://api.example.com',
  apiKey: process.env.API_KEY
});

const result = await api.get('/users');
\`\`\`

### Advanced Usage
\`\`\`javascript
// Advanced example
const api = new API({
  baseURL: 'https://api.example.com',
  apiKey: process.env.API_KEY,
  timeout: 5000,
  retries: 3
});
\`\`\`

---

## 🔌 API Reference

### Authentication
All API requests require authentication using an API key in the header:
\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

### Endpoints

#### GET /users
Retrieves a list of users.

**Parameters:**
- \`page\` (optional): Page number for pagination
- \`limit\` (optional): Number of items per page

**Response:**
\`\`\`json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
\`\`\`

#### POST /users
Creates a new user.

**Request Body:**
\`\`\`json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": 2,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
\`\`\`

### Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: Connection Refused
**Symptoms:** Cannot connect to the API
**Solution:** Check if the server is running and the port is correct

#### Issue 2: Authentication Failed
**Symptoms:** Getting 401 errors
**Solution:** Verify your API key is correct and not expired

#### Issue 3: Database Connection Error
**Symptoms:** Database-related errors
**Solution:** Check database configuration and ensure the database is running

### Debug Mode
Enable debug mode for more detailed logs:
\`\`\`bash
DEBUG=* npm run dev
\`\`\`

### Logs
Logs are stored in:
- **Application logs:** \`logs/app.log\`
- **Error logs:** \`logs/error.log\`
- **Access logs:** \`logs/access.log\`

---

## 💡 Examples

### Example 1: User Management
\`\`\`javascript
// Create a user
const user = await api.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Get user by ID
const user = await api.get(\`/users/\${userId}\`);

// Update user
const updatedUser = await api.put(\`/users/\${userId}\`, {
  name: 'John Smith'
});

// Delete user
await api.delete(\`/users/\${userId}\`);
\`\`\`

### Example 2: Batch Operations
\`\`\`javascript
// Batch create users
const users = await api.post('/users/batch', [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' }
]);
\`\`\`

---

## 📝 Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

---

## 📞 Support
- **Email:** support@example.com
- **Documentation:** https://docs.example.com
- **Issues:** https://github.com/example/repo/issues

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
`,
};

export default TechnicalDocumentationTemplate; 