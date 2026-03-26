import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { flowTrack } from '@/lib/tracking/flow'

export const runtime = "nodejs"

export async function POST(req: Request) {
  await flowTrack('login','start','start')

  try {
    const body = await req.json()

    // keep original logic placeholder (user project will have real logic)
    const result = { success: true }

    await flowTrack('login','complete','success')

    return NextResponse.json(result)

  } catch (e) {
    await flowTrack('login','error','fail',{ error: String(e) })
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
