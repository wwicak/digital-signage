import User, { UserRoleName } from '../models/User'
import mongoose from 'mongoose'

// Create or get system user for public display registrations
export async function getOrCreateSystemUser() {
  const systemEmail = 'system@display-registrations.local'
  
  let systemUser = await User.findOne({ email: systemEmail })
  
  if (!systemUser) {
    // Create system user
    systemUser = new User({
      name: 'System Display Registration',
      email: systemEmail,
      username: 'system_display_registration',
      role: {
        name: UserRoleName.SUPER_ADMIN, // Give system user admin permissions
        associatedBuildingIds: [],
        associatedDisplayIds: []
      }
    })
    
    // Save without password (system user doesn't need login)
    await systemUser.save()
  }
  
  return systemUser._id
}

// Get a default system user ID for cases where we need one immediately
export function getDefaultSystemUserId(): mongoose.Types.ObjectId {
  // Use a fixed ObjectId for system operations
  return new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
}