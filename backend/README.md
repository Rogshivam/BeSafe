# VSafe Backend API

A comprehensive backend for the VSafe emergency response application built with Node.js, Express, MongoDB, and Socket.io.

## Features

- **User Management**: Registration, authentication, profile management
- **Emergency System**: Real-time emergency triggers and alerts
- **Location Tracking**: Live location sharing and history
- **Communication**: Messaging between emergency contacts
- **Real-time Notifications**: Socket.io for instant updates
- **File Uploads**: Support for images and audio in emergencies
- **Priority-based Alerts**: High/Medium/Low priority notification system

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Users
- `GET /api/users/search` - Search users
- `GET /api/users/emergency-contacts` - Get emergency contacts
- `POST /api/users/emergency-contacts` - Add emergency contact
- `PUT /api/users/emergency-contacts/:contactId` - Update emergency contact
- `DELETE /api/users/emergency-contacts/:contactId` - Remove emergency contact
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/status` - Update user status

### Emergency
- `POST /api/emergency/trigger` - Trigger emergency
- `GET /api/emergency/active` - Get active emergencies
- `POST /api/emergency/:emergencyId/respond` - Respond to emergency
- `GET /api/emergency/:emergencyId` - Get emergency details
- `POST /api/emergency/:emergencyId/resolve` - Resolve emergency
- `GET /api/emergency/history/:userId` - Get emergency history

### Location
- `POST /api/location/update` - Update location
- `GET /api/location/:userId/current` - Get current location
- `GET /api/location/:userId/history` - Get location history
- `GET /api/location/nearby` - Find nearby users
- `GET /api/location/:userId/stats` - Get location statistics
- `PUT /api/location/sharing-preferences` - Update sharing preferences

### Communication
- `POST /api/communication/send` - Send message
- `GET /api/communication/conversation/:userId` - Get conversation
- `GET /api/communication/emergency/:emergencyId` - Get emergency messages
- `GET /api/communication/unread` - Get unread messages
- `PUT /api/communication/:messageId/read` - Mark message as read
- `POST /api/communication/trigger-alarm` - Trigger alarm
- `DELETE /api/communication/:messageId` - Delete message

## Socket.io Events

### Client to Server
- `join-room` - Join user's personal room
- `emergency-trigger` - Trigger emergency event
- `location-update` - Send location update

### Server to Client
- `emergency-alert` - Emergency notification
- `location-update` - Location update notification
- `emergency-response` - Emergency response notification
- `emergency-resolved` - Emergency resolved notification
- `new-message` - New message notification
- `emergency-alarm` - Alarm notification

## Database Models

### User
- Personal information (name, email, phone, age)
- User type (Individual/Member)
- Emergency status (Safe/Alert/Emergency)
- Emergency contacts with priorities
- Location tracking
- Notification preferences

### Emergency
- Individual who triggered it
- Trigger type (Manual/Voice/Gesture/Auto/Location)
- Location and media
- Notified members and their responses
- Timeline of events
- Resolution details

### Message
- Sender and receiver
- Message type (Text/Image/Audio/Location/System)
- Content and media
- Emergency association
- Read/delivery status

## Environment Variables

Create a `.env` file with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/besafe
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Twilio configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables as shown above

4. Start MongoDB server

5. Start the application:
   ```bash
   npm run dev
   ```

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- CORS configuration
- Helmet for security headers

## File Upload

- Profile images: Max 2MB
- Emergency media: Max 10MB
- Message media: Max 5MB
- Supported formats: Images (JPEG, PNG, GIF) and Audio (MP3, WAV)

## Priority System

### Emergency Contacts Priority
- **High**: Instant alert + Continuous updates
- **Medium**: Notification + Manual action
- **Low**: Alert only if others don't respond

### Message Priority
- **Low**: Regular priority
- **Normal**: Default priority
- **High**: Important messages
- **Urgent**: Critical emergency messages

## Real-time Features

- Live location sharing during emergencies
- Instant emergency alerts
- Real-time messaging
- Emergency response tracking
- Status updates

## Error Handling

All API responses follow a consistent format:

```json
{
  "success": true/false,
  "message": "Description",
  "data": {},
  "errors": []
}
```

## Testing

Run tests with:
```bash
npm test
```

## Deployment

1. Set production environment variables
2. Build the application
3. Use a process manager like PM2
4. Configure reverse proxy (nginx)
5. Set up SSL certificates

## License

MIT License
