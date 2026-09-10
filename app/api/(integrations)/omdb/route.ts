import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'OMDb API key not configured' }, { status: 500 });
  }

  const title = searchParams.get('t');
  const id = searchParams.get('i');
  const search = searchParams.get('s');

  if (!title && !id && !search) {
    return NextResponse.json({ error: 'Missing required query parameters (t, i, or s)' }, { status: 400 });
  }

  const queryParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    queryParams.append(key, value);
  }
  queryParams.append('apikey', apiKey);

  try {
    const response = await fetch(`https://www.omdbapi.com/?${queryParams.toString()}`);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from OMDb API' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to OMDb:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
