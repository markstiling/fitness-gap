# FitnessGap

A beautiful, minimalist web application that automatically finds and schedules workout time slots in your Google Calendar. Built with Next.js, TypeScript, and Tailwind CSS.

<!-- Force deployment update -->

## Features

- 🔐 **Google OAuth Authentication** - Secure login with your Google account
- 📅 **Smart Calendar Integration** - Automatically scans your Google Calendar for available time slots
- ⏰ **Flexible Scheduling** - Choose between 15-minute or 30-minute workout sessions
- 🎯 **Customizable Preferences** - Set your preferred workout times and timezone
- 🎨 **Beautiful UI** - Clean, minimalist design with smooth animations
- 📱 **Responsive Design** - Works perfectly on desktop and mobile devices

## How It Works

1. **Sign in** with your Google account
2. **Set preferences** for your preferred workout times and duration
3. **Find available slots** by scanning your calendar for gaps
4. **Schedule workouts** with a single click

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18+ 
- npm or yarn
- A Google Cloud Console project with Calendar API enabled

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd fitness-gap
npm install
```

### 2. Set Up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
6. Copy your Client ID and Client Secret

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Database (for user preferences)
DATABASE_URL="file:./dev.db"
```

**Important:** Replace the placeholder values with your actual credentials:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from your Google Cloud Console
- `NEXTAUTH_SECRET` - generate a random string (you can use `openssl rand -base64 32`)

### 4. Set Up the Database

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
fitness-gap/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/     # NextAuth configuration
│   │   │   ├── calendar/               # Calendar API endpoints
│   │   │   └── preferences/            # User preferences API
│   │   ├── globals.css                 # Global styles
│   │   ├── layout.tsx                  # Root layout
│   │   └── page.tsx                    # Main page
│   ├── components/
│   │   ├── Dashboard.tsx               # Main dashboard component
│   │   └── Preferences.tsx             # User preferences component
│   └── lib/
│       ├── calendar.ts                 # Google Calendar service
│       ├── prisma.ts                   # Prisma client
│       └── session-provider.tsx        # NextAuth session provider
├── prisma/
│   └── schema.prisma                   # Database schema
└── .env                                # Environment variables
```

## API Endpoints

- `POST /api/calendar/slots` - Find available time slots
- `POST /api/calendar/schedule` - Schedule a workout
- `GET /api/preferences` - Get user preferences
- `POST /api/preferences` - Save user preferences

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **NextAuth.js** - Authentication for Next.js
- **Prisma** - Database ORM
- **SQLite** - Local database
- **Google Calendar API** - Calendar integration
- **Lucide React** - Beautiful icons

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
