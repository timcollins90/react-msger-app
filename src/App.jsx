import { useState, useEffect, useRef, useMemo } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io();

function App() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [username, setUsername] = useState(sessionStorage.getItem('chat_username') || '');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {  

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeUsers = useMemo(() => {
    const currentName = username || 'Anonymous';
    const users = new Set([currentName]); 
    messages.forEach(msg => {
      if (msg.author) users.add(msg.author);
    });
    return Array.from(users);
  }, [messages, username]);


  const joinRoom = (roomUuid) => {
    setRoom(roomUuid);
    setMessages([]);
    socket.emit('join_room', roomUuid);
    const newUrl = window.location.pathname + '?room=' + roomUuid;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('receive_message', (data) => setMessages((prev) => [...prev, data]));
    socket.on('history', (history) => setMessages(history));

    const searchParams = new URLSearchParams(window.location.search);
    const urlRoom = searchParams.get('room');
    if (urlRoom) joinRoom(urlRoom);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('receive_message');
      socket.off('history');
    };
  }, []);

  const createRoom = async () => {
    try {
      const res = await fetch('/api/create-room', { method: 'POST' });
      const data = await res.json();
      joinRoom(data.uuid);
    } catch (err) {
      console.error("Failed to create room:", err);
      
    }
  };

  const sendMessage = () => {
    if (currentMessage.trim() !== '' && room) {
      const messageData = {
        room: room,
        content: currentMessage,
        author: username
      };

      socket.emit('send_message', messageData);
      setMessages((prev) => [...prev, {
        ...messageData,
        id: Date.now(),
        timestamp: new Date().toISOString()
      }]);
      setCurrentMessage('');
    }
  };

  const handleLogin = (name) => {
    const nameToUse = name.trim() ? name : 'Anonymous';
    
    setUsername(nameToUse);
    sessionStorage.setItem('chat_username', nameToUse);
  };

  // --- SCREEN 1: LOGIN ---
  if (!username) {
    return (
      <div className="App">
        <div className="login-window-container">
            <div className="login-window">
            <div className="title-bar">
                <span>Sign On to MSGER</span>
                <div className="title-controls"></div>
            </div>
            <div className="login-body">
                <div style={{fontStyle: 'italic', fontSize: '12px', marginBottom: '5px'}}>Enter Screen Name:</div>
                <input
                className="login-input"
                id="usernameInput"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e.target.value)}
                />
                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '10px'}}>
                    <button className="aim-send-btn" style={{width: '80px', height: '28px'}} onClick={() => handleLogin(document.getElementById('usernameInput').value)}>
                        OK
                    </button>
                </div>
            </div>
            </div>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: MAIN CHAT WINDOW ---
  return (
    <div className="App">
      <div className="aim-window">
        {/* Title Bar */}
        <div className="title-bar">
          <div style={{display:'flex', alignItems:'center', gap: '5px'}}>
             <span style={{fontSize: '16px'}}>&#128172;</span> 
             <span>{room ? `Chat Room` : 'MSGER'}</span>
          </div>
        {!room ? (
          <div className="title-controls"></div>
        ) : (  
          <div className="title-controls">
            <button onClick={() => {
                 setRoom(null); 
                 window.history.pushState({}, '', window.location.pathname);
            }}>X</button>
          </div>
        )}
        </div>

        {!room ? (
          // --- ROOM SELECTOR ---
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', background: '#000'}}>
              <div style={{border: '2px solid #fff', outline: '1px solid #808080', padding: '20px', background: '#c0c0c0', width: '250px'}}>
                 <p>Welcome, <b>{username}</b>.</p>
                 <button className="aim-send-btn" style={{height: '30px', width: '100%'}} onClick={createRoom}>
                     Create New Room
                 </button>
                 <br/> <br/>

                <div style={{fontStyle: 'italic', fontSize: '12px', textAlign: 'center'}}><span>--- OR ---</span></div>

                 <br/>
                 <div style={{display: 'flex', gap: '5px'}}>
                    <input className="login-input" id="roomInput" placeholder="Room ID..." style={{flex: 1}} />
                    <button className="aim-send-btn" style={{height: '30px', width: '50px'}} onClick={() => joinRoom(document.getElementById('roomInput').value)}>
                        Go
                    </button>
                 </div>
              </div>
          </div>
        ) : (
          // --- CHAT INTERFACE ---
          <>
            <div className="main-content">
                {/* Left: Messages */}
                <div className="chat-history">
                    
                    {/* // --- SYSTEM MESSAGE BLOCK --- */}
                    <div style={{color: '#808080', marginBottom: '10px', fontStyle: 'italic'}}>
                        {/* 1. ROOM ID */}
                        <span style={{display: 'block', marginBottom: '5px', color: '#000', fontStyle: 'normal'}}>
                            Room ID: <b>{room}</b>
                        </span>
                        
                        {/* 2. JOIN MESSAGE */}
                        *** You have joined the room ***
                        <br/>
                        
                        {/* 3. COPY LINK */}
                        <span 
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert("Link copied to clipboard!\n\nSend this to your friend.");
                            }}
                            style={{
                                color: 'blue', 
                                textDecoration: 'underline', 
                                cursor: 'pointer',
                                fontSize: '12px',
                                marginLeft: '10px'
                            }}
                        >
                            (Click here to copy invite link)
                        </span>
                    </div>

                    {messages.map((msg, index) => {
                        const isMe = msg.author === username;
                        return (
                            <div key={index} className="message-line">
                                <span className={`msg-author ${isMe ? 'me' : ''}`}>
                                    {msg.author}:
                                </span>
                                <span className="msg-text">
                                    {msg.content}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Right: Buddy List */}
                <div className="buddy-list">
                    <div className="buddy-header">People here</div>
                    {activeUsers.map((user, i) => (
                        <div key={i} className="buddy-item">
                            <span className="buddy-icon">🙂</span>
                            <span>{user}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Input Area */}
            <div className="input-area">
                <textarea
                    className="aim-textarea"
                    value={currentMessage}
                    onChange={(event) => setCurrentMessage(event.target.value)}
                    onKeyPress={(event) => event.key === 'Enter' && !event.shiftKey && (event.preventDefault(), sendMessage())}
                    autoFocus
                />
                <button className="aim-send-btn" onClick={sendMessage}>
                    Send
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;