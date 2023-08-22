import type { Request, Response } from 'express'

import { updateUserCanLogin } from '../../database/updateUser.js'

export function handler(request: Request, response: Response): void {
  const success = updateUserCanLogin(
    request.body.userName,
    request.body.permissionValue,
    request.session.user as EmileUser
  )

  response.json({
    success
  })
}

export default handler
