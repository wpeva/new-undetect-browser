/**
 * Cloud API Examples
 *
 * Demonstrates how to use the Cloud API
 */

import { CloudAPIServer } from './server';
// Note: socket.io-client is optional, only needed for WebSocket examples
// import { io as ioClient, Socket } from 'socket.io-client';

/**
 * Example 1: Basic server setup
 */
async function basicServerSetup() {
  console.log('\n=== Example 1: Basic Server Setup ===\n');

  const server = new CloudAPIServer({
    port: 3000,
    host: 'localhost',
  });

  await server.start();

  // Server is now running
  console.log('✓ Server started successfully');

  // You can now make API calls to http://localhost:3000/api/v1

  // Stop server after 5 seconds
  setTimeout(async () => {
    await server.stop();
    console.log('✓ Server stopped');
  }, 5000);
}

/**
 * Example 2: Create and manage sessions programmatically
 */
async function sessionManagement() {
  console.log('\n=== Example 2: Session Management ===\n');

  const server = new CloudAPIServer({ port: 3001 });
  await server.start();

  const sessionManager = server.getSessionManager();

  // Create a session
  console.log('Creating session...');
  const session = await sessionManager.create({
    os: 'windows',
    protectionLevel: 'advanced',
    maxDuration: 1800, // 30 minutes
  });
  console.log('✓ Session created:', session.id);

  // Get session info
  const sessionInfo = await sessionManager.get(session.id);
  console.log('✓ Session status:', sessionInfo.status);

  // Execute script
  console.log('Executing script...');
  const result = await sessionManager.execute(
    session.id,
    'console.log("Hello from browser!")'
  );
  console.log('✓ Script executed:', result.success);

  // List all sessions
  const sessions = await sessionManager.list();
  console.log('✓ Total sessions:', sessions.length);

  // Get stats
  const stats = sessionManager.getStats();
  console.log('✓ Session stats:', stats);

  // Destroy session
  await sessionManager.destroy(session.id);
  console.log('✓ Session destroyed');

  await server.stop();
}

/**
 * Example 3: REST API usage
 */
async function restAPIUsage() {
  console.log('\n=== Example 3: REST API Usage ===\n');

  const server = new CloudAPIServer({ port: 3002 });
  await server.start();

  const baseURL = 'http://localhost:3002/api/v1';

  // Create session via REST API
  console.log('Creating session via REST API...');
  const createResponse = await fetch(`${baseURL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      os: 'mac',
      protectionLevel: 'standard',
    }),
  });
  const { session } = await createResponse.json();
  console.log('✓ Session created:', session.id);

  // Get session
  const getResponse = await fetch(`${baseURL}/sessions/${session.id}`);
  const sessionData = await getResponse.json();
  console.log('✓ Session retrieved:', sessionData.session.status);

  // Execute script
  console.log('Executing script via REST API...');
  const executeResponse = await fetch(`${baseURL}/sessions/${session.id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script: 'document.title',
    }),
  });
  const executeResult = await executeResponse.json();
  console.log('✓ Script executed:', executeResult.success);

  // List sessions
  const listResponse = await fetch(`${baseURL}/sessions`);
  const { sessions } = await listResponse.json();
  console.log('✓ Total sessions:', sessions.length);

  // Health check
  const healthResponse = await fetch(`${baseURL}/health`);
  const health = await healthResponse.json();
  console.log('✓ Server health:', health.status);

  // Delete session
  await fetch(`${baseURL}/sessions/${session.id}`, {
    method: 'DELETE',
  });
  console.log('✓ Session deleted');

  await server.stop();
}

/**
 * Example 4: WebSocket usage
 */
async function webSocketUsage() {
  console.log('\n=== Example 4: WebSocket Usage ===\n');

  const server = new CloudAPIServer({ port: 3003 });
  await server.start();

  // Connect WebSocket client
  // Note: Uncomment when socket.io-client is installed
  // const socket: Socket = ioClient('http://localhost:3003', {
  //   transports: ['websocket'],
  // });
  const socket: any = null;

  if (!socket) {
    console.log('⚠️  WebSocket example requires socket.io-client to be installed');
    console.log('   Install with: npm install socket.io-client');
    await server.stop();
    return;
  }

  // Wait for connection
  await new Promise<void>((resolve) => {
    socket.on('connect', () => {
      console.log('✓ WebSocket connected:', socket.id);
      resolve();
    });
  });

  // Listen for messages
  socket.on('message', (message: any) => {
    console.log('📨 Received:', message.type);
  });

  // Create session via session manager
  const sessionManager = server.getSessionManager();
  const session = await sessionManager.create({ os: 'linux' });
  console.log('✓ Session created:', session.id);

  // Subscribe to session events
  socket.emit('subscribe', { sessionId: session.id });
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('✓ Subscribed to session events');

  // Execute script via WebSocket
  socket.emit('execute', {
    sessionId: session.id,
    script: 'navigator.userAgent',
    requestId: 'test-1',
  });

  // Wait for result
  await new Promise(resolve => setTimeout(resolve, 200));

  // Get session info via WebSocket
  socket.emit('message', {
    type: 'session:get',
    sessionId: session.id,
    requestId: 'test-2',
  });

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 200));

  // Send CDP command
  socket.emit('cdp', {
    id: 1,
    method: 'Page.navigate',
    params: { url: 'https://example.com' },
    sessionId: session.id,
  });

  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('✓ CDP command sent');

  // Unsubscribe
  socket.emit('unsubscribe', { sessionId: session.id });
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('✓ Unsubscribed from session');

  // Cleanup
  await sessionManager.destroy(session.id);
  socket.disconnect();
  await server.stop();
  console.log('✓ Cleanup complete');
}

/**
 * Example 5: Advanced configuration
 */
async function advancedConfiguration() {
  console.log('\n=== Example 5: Advanced Configuration ===\n');

  const server = new CloudAPIServer({
    port: 3004,
    host: '0.0.0.0',
    cors: {
      origin: ['http://localhost:3000', 'https://app.example.com'],
      credentials: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // limit each IP to 200 requests per windowMs
    },
    apiPrefix: '/api/v1',
    enableSwagger: true,
  });

  await server.start();
  console.log('✓ Server started with custom config');

  // Create session with proxy
  const sessionManager = server.getSessionManager();
  const session = await sessionManager.create({
    os: 'windows',
    country: 'US',
    protectionLevel: 'paranoid',
    proxy: {
      host: 'proxy.example.com',
      port: 8080,
      username: 'user',
      password: 'pass',
      type: 'http',
    },
    maxDuration: 7200, // 2 hours
  });

  console.log('✓ Session with proxy created:', session.id);
  console.log('  Protection level:', session.config.protectionLevel);
  console.log('  Proxy:', session.config.proxy?.host);

  // Monitor session events
  sessionManager.on('session:activity', (s: any) => {
    console.log('📊 Session activity:', s.id);
  });

  sessionManager.on('session:error', (s: any) => {
    console.error('❌ Session error:', s.id, s.error);
  });

  // Update activity
  await sessionManager.updateActivity(session.id);
  console.log('✓ Activity updated');

  // Get WebSocket stats
  const wsServer = server.getWebSocketServer();
  const wsStats = wsServer.getStats();
  console.log('✓ WebSocket stats:', wsStats);

  // Cleanup
  await sessionManager.destroy(session.id);
  await server.stop();
}

/**
 * Example 6: Complete workflow
 */
async function completeWorkflow() {
  console.log('\n=== Example 6: Complete Workflow ===\n');

  const server = new CloudAPIServer({ port: 3005 });
  await server.start();
  console.log('✓ Server started');

  const baseURL = 'http://localhost:3005/api/v1';

  // Step 1: Create multiple sessions
  console.log('\n[Step 1] Creating sessions...');
  const sessions = [];
  for (let i = 0; i < 3; i++) {
    const response = await fetch(`${baseURL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        os: ['windows', 'mac', 'linux'][i],
        protectionLevel: 'standard',
      }),
    });
    const { session } = await response.json();
    sessions.push(session);
    console.log(`  ✓ Session ${i + 1} created: ${session.id}`);
  }

  // Step 2: Execute scripts in parallel
  console.log('\n[Step 2] Executing scripts in parallel...');
  const executePromises = sessions.map((session) =>
    fetch(`${baseURL}/sessions/${session.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: `
          console.log('Running on ' + navigator.platform);
          navigator.userAgent;
        `,
      }),
    })
  );
  await Promise.all(executePromises);
  console.log(`  ✓ Executed scripts in ${sessions.length} sessions`);

  // Step 3: Get stats
  console.log('\n[Step 3] Getting statistics...');
  const statsResponse = await fetch(`${baseURL}/stats`);
  const stats = await statsResponse.json();
  console.log('  ✓ Sessions by status:');
  Object.entries(stats.sessions.byStatus).forEach(([status, count]) => {
    if ((count as number) > 0) {
      console.log(`    - ${status}: ${count}`);
    }
  });

  // Step 4: List active sessions
  console.log('\n[Step 4] Listing active sessions...');
  const listResponse = await fetch(`${baseURL}/sessions?status=ready`);
  const { sessions: activeSessions } = await listResponse.json();
  console.log(`  ✓ Active sessions: ${activeSessions.length}`);

  // Step 5: Cleanup
  console.log('\n[Step 5] Cleaning up...');
  for (const session of sessions) {
    await fetch(`${baseURL}/sessions/${session.id}`, {
      method: 'DELETE',
    });
    console.log(`  ✓ Destroyed session: ${session.id}`);
  }

  await server.stop();
  console.log('\n✓ Workflow complete!');
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║        Cloud API Examples                              ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Run examples one by one
    // await basicServerSetup();
    // await sessionManagement();
    // await restAPIUsage();
    // await webSocketUsage();
    // await advancedConfiguration();
    await completeWorkflow();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

export {
  basicServerSetup,
  sessionManagement,
  restAPIUsage,
  webSocketUsage,
  advancedConfiguration,
  completeWorkflow,
};
