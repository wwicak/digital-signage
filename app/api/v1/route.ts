import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  return NextResponse.json({ message: 'API v1 endpoint' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ message: 'API v1 endpoint', body })
}
