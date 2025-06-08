# 🏢 Meeting Room Reservation System

A comprehensive meeting room management system integrated with your digital signage platform, featuring real-time calendar synchronization, conflict detection, and beautiful admin interfaces.

## ✨ Features

### 🎯 **Core Functionality**
- **Building Management** - Organize rooms by buildings/locations
- **Room Management** - Track capacity, facilities, and availability
- **Reservation System** - Create, edit, and manage meeting bookings
- **Conflict Detection** - Prevent double-bookings automatically
- **Real-time Updates** - Live updates across all displays via SSE

### 📅 **Calendar Integration**
- **Google Calendar Sync** - Bidirectional synchronization
- **Outlook Calendar Sync** - Microsoft Graph API integration
- **External Event Management** - Handle externally created events
- **Automatic Token Refresh** - Seamless authentication management
- **Sync Status Monitoring** - Visual indicators for connection health

### 📊 **Admin Dashboard**
- **System Overview** - Key metrics and statistics
- **Room Utilization** - Track usage patterns and efficiency
- **Recent Activity** - Monitor latest reservations and changes
- **Building Statistics** - Compare usage across locations
- **Calendar Health** - Monitor sync status and errors

### 📺 **Digital Signage Widget**
- **Today's Meetings** - Display current and upcoming reservations
- **Building-specific Views** - Filter by location
- **Real-time Updates** - Automatic refresh and live data
- **Status Indicators** - Current, upcoming, and completed meetings
- **Source Badges** - Show Google/Outlook/Internal origins

## 🚀 Quick Start

### 1. **Setup Sample Data**
```bash
# Create sample buildings and rooms
node scripts/setup-meeting-rooms.js
```

### 2. **Start Development Server**
```bash
npm run dev
```

### 3. **Access Admin Interface**
Navigate to your admin panel and explore:
- **Dashboard** - `/dashboard` - System overview
- **Buildings** - `/buildings` - Manage buildings
- **Meeting Rooms** - `/rooms` - Manage rooms
- **Reservations** - `/reservations` - Booking management
- **Calendar Sync** - `/calendar-integration` - Connect calendars

## 📋 API Endpoints

### Buildings
- `GET /api/v1/buildings` - List buildings
- `POST /api/v1/buildings` - Create building
- `GET /api/v1/buildings/[id]` - Get building
- `PUT /api/v1/buildings/[id]` - Update building
- `DELETE /api/v1/buildings/[id]` - Delete building

### Rooms
- `GET /api/v1/rooms` - List rooms
- `POST /api/v1/rooms` - Create room
- `GET /api/v1/rooms/[id]` - Get room
- `PUT /api/v1/rooms/[id]` - Update room
- `DELETE /api/v1/rooms/[id]` - Delete room

### Reservations
- `GET /api/v1/reservations` - List reservations
- `POST /api/v1/reservations` - Create reservation
- `GET /api/v1/reservations/[id]` - Get reservation
- `PUT /api/v1/reservations/[id]` - Update reservation
- `DELETE /api/v1/reservations/[id]` - Delete reservation

### Calendar Integration
- `GET /api/v1/calendar` - List calendar connections
- `GET /api/v1/calendar/google/authorize` - Start Google OAuth
- `GET /api/v1/calendar/outlook/authorize` - Start Outlook OAuth
- `POST /api/v1/calendar/[linkId]/sync` - Manual sync
- `DELETE /api/v1/calendar/[linkId]` - Disconnect calendar

### Dashboard
- `GET /api/v1/dashboard` - Get dashboard statistics

## 🔧 Calendar Integration Setup

### Google Calendar Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Calendar API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URI: `http://localhost:3000/api/v1/calendar/google/callback`

4. **Add to Environment Variables**
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/calendar/google/callback
   ```

### Outlook Calendar Setup

1. **Register Azure App**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to "Azure Active Directory" > "App registrations"
   - Click "New registration"

2. **Configure App**
   - Set redirect URI: `http://localhost:3000/api/v1/calendar/outlook/callback`
   - Note the Application (client) ID

3. **Create Client Secret**
   - Go to "Certificates & secrets"
   - Create a new client secret

4. **Set API Permissions**
   - Go to "API permissions"
   - Add Microsoft Graph permissions:
     - `Calendars.ReadWrite`
     - `User.Read`

5. **Add to Environment Variables**
   ```env
   OUTLOOK_CLIENT_ID=your_outlook_client_id
   OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
   OUTLOOK_REDIRECT_URI=http://localhost:3000/api/v1/calendar/outlook/callback
   ```

## 🎨 Digital Signage Widget

### Adding the Widget

1. **Navigate to Layout Page**
   - Go to your display's layout page
   - Click "Add Widget"

2. **Select Meeting Room Widget**
   - Choose "Meeting Room Display" from the widget list
   - Configure the widget options

3. **Widget Configuration**
   - **Building Filter** - Show specific building or all buildings
   - **Refresh Interval** - How often to update (5-300 seconds)
   - **Max Reservations** - Number of meetings to display
   - **Show Upcoming** - Include future meetings for today

### Widget Features

- **Real-time Updates** - Automatically refreshes every 30 seconds
- **Status Indicators** - Visual badges for meeting status
- **Source Labels** - Shows Google/Outlook/Internal origins
- **Time Display** - Current time and meeting schedules
- **Building Context** - Shows building name when filtered

## 🔐 Permissions

The system uses role-based access control (RBAC). Admin users automatically receive these permissions:

- `building:read`, `building:create`, `building:update`, `building:delete`
- `room:read`, `room:create`, `room:update`, `room:delete`
- `reservation:read`, `reservation:create`, `reservation:update`, `reservation:delete`
- `calendar:read`, `calendar:create`, `calendar:update`, `calendar:delete`
- `dashboard:read`

## 🛠️ Development

### Project Structure
```
├── app/api/v1/
│   ├── buildings/          # Building CRUD operations
│   ├── rooms/              # Room CRUD operations
│   ├── reservations/       # Reservation CRUD operations
│   ├── calendar/           # Calendar integration
│   └── dashboard/          # Dashboard statistics
├── pages/
│   ├── buildings.tsx       # Building management UI
│   ├── rooms.tsx          # Room management UI
│   ├── reservations.tsx   # Reservation management UI
│   ├── calendar-integration.tsx # Calendar setup UI
│   └── dashboard.tsx      # Dashboard UI
├── components/
│   ├── Calendar/          # Calendar view components
│   └── Widgets/           # Meeting room display widget
├── widgets/meeting-room/  # Widget definition
├── hooks/                 # React hooks for API calls
└── scripts/               # Setup and utility scripts
```

### Key Technologies
- **Next.js** - React framework
- **MongoDB** - Database with Mongoose ODM
- **Tailwind CSS** - Styling with shadcn/ui components
- **Server-Sent Events** - Real-time updates
- **Google Calendar API** - Calendar integration
- **Microsoft Graph API** - Outlook integration

## 🐛 Troubleshooting

### Common Issues

1. **Calendar Sync Failing**
   - Check OAuth credentials in environment variables
   - Verify redirect URIs match exactly
   - Ensure API permissions are granted

2. **Real-time Updates Not Working**
   - Check SSE connection in browser dev tools
   - Verify server-sent events are enabled
   - Check for firewall/proxy issues

3. **Permission Denied Errors**
   - Run setup script to add permissions: `node scripts/setup-meeting-rooms.js`
   - Check user role and permissions in database

4. **Widget Not Displaying**
   - Verify widget is registered in `widgets/index.ts`
   - Check widget type in `widgets/widget_list.ts`
   - Restart development server

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Check browser console for errors
4. Verify environment variables are set correctly

## 🎉 Success!

Your meeting room reservation system is now ready! The system provides:
- ✅ Complete room and building management
- ✅ Advanced reservation system with conflict detection
- ✅ Google and Outlook calendar integration
- ✅ Real-time digital signage displays
- ✅ Comprehensive admin dashboard
- ✅ Mobile-responsive design

Enjoy your new meeting room management system! 🚀
