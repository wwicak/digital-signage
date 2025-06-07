import React, { memo } from 'react'

import Frame from '../components/Admin/Frame.tsx'
import UserList from '../components/Admin/UserList.tsx'

import { protect, ProtectProps } from '../helpers/auth'

interface UsersProps extends ProtectProps {
  // No additional props needed for users page
}

const UsersComponent = memo(function UsersComponent({ loggedIn }: UsersProps) {
  return (
    <Frame loggedIn={loggedIn}>
      <UserList />
    </Frame>
  )
})

export default protect(UsersComponent)