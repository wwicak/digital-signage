import React, { useRef, memo } from 'react'

import Frame from '../components/Admin/Frame.tsx'
import UserList, { IUserListRef } from '../components/Admin/UserList.tsx'
import Dialog from '../components/Dialog.tsx'
import { Button } from '../components/Form'

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
      <h1 className="font-sans text-2xl text-gray-600 m-0">Users</h1>
      <div className="my-10 mx-auto max-w-[640px]">
        <UserList ref={userListRef} />
        <Dialog><div></div></Dialog>
        <Button
          text={'+ Add new user'}
          color={'#7bc043'}
          onClick={handleAddUser}
          style={{ marginLeft: 0, width: '100%' }}
        />
      </div>
    </Frame>
  )
})

export default protect(UsersComponent)