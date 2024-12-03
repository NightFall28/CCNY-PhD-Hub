import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// Helper function to create a new client instance
const createClient = () => {
  return new Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT || '5432', 10),
    ssl: {
      rejectUnauthorized: false,
    },
  });
};

// Handle GET requests to fetch posts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const communityId = searchParams.get('communityId');

  if (!communityId) {
    return NextResponse.json(
      { error: 'Community ID is required' },
      { status: 400 }
    );
  }

  const client = createClient();
  await client.connect();
  try {
    const result = await client.query(
      'SELECT * FROM posts WHERE community_id = $1 ORDER BY created_at DESC',
      [communityId]
    );
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.end();
  }
}

// Handle POST requests to create a new post
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json(); // Parse JSON body safely
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { communityId, title, content, mediaUrl } = body;

  if (!communityId || !title || !content) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const client = createClient();
  await client.connect();
  try {
    const result = await client.query(
      'INSERT INTO posts (community_id, title, content, media_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [communityId, title, content, mediaUrl]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.end();
  }
}