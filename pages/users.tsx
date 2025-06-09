import React, { useRef, memo } from 'react'
import { Users } from 'lucide-react'

import Frame from '../components/Admin/Frame.tsx'
import UserList, { IUserListRef } from '../components/Admin/UserList.tsx'
import Dialog from '../components/Dialog.tsx'
import { Button } from '@/components/ui/button'

import { protect, ProtectProps } from '../helpers/auth'

interface UsersProps extends ProtectProps {
  // No additional props needed for users page
}

const UsersComponent = memo(function UsersComponent({ loggedIn }: UsersProps) {
  const userListRef = useRef<IUserListRef>(null)

  const handleAddUser = () => {
    if (userListRef.current) {
      userListRef.current.openCreateDialog()
    }
  }

  return (
    <Frame loggedIn={loggedIn}>
      <div className='space-y-8'>
        {/* Header Section */}
        <div className='flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Users</h1>
            <p className='text-muted-foreground'>
              Manage user accounts and permissions for your digital signage system.
            </p>
          </div>
          <Button
            onClick={handleAddUser}
            size='lg'
            className='w-full sm:w-auto'
          >
            <Users className='mr-2 h-5 w-5' />
            Add New User
          </Button>
        </div>

        {/* Users List */}
        <div className='space-y-6'>
          <UserList ref={userListRef} />
        </div>
        
        <Dialog><div></div></Dialog>
      </div>
    </Frame>
  )
})

export default protect(UsersComponent)