/* ==============================
 Global Variables
 ================================ */
//const socket = io();
// Chi demo trong hop goi tu trinh duyet sang mobile, chuan bi san 2 account idol va user, user dat lich cho idol sau do tat user d, chuyen qua thuc hien cuoc goi tren trinh duyet
const options = {
  hostname: "hiwinchat.yourtv.asia",
  port: 443, 
  secure: true,
  autoReconnect: true,
  rejectUnauthorized: true,
  connectTimeout: 10000, //milliseconds
  ackTimeout: 10000, //milliseconds
}
const remoteId = 496; // id cua idol
const localId = 269; // id cua user
const handshakeRTC = "handshakeRTC";
const socket = socketCluster.create(options);
socket.on('connect', async () => { // khoi tao va dang nhap socket
  console.log("============da ket noi socket cluster");
  await getLocalStream();
  socket.emit('login', {
    userid: localId,
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjQ5NiwiaWF0IjoxNTc4NDc1MDE4fQ.EP-sOEhpBlBAEGl_YG-C_BE9zvegGmGm6GOyHs9U-II" //jwt tuong ung 
  }, err => {
    if(!err) {
      console.log("============Dang nhap thanh cong");
      socket.listener = socket.subscribe(localId+"");
      socket.listener.watch(data => {
        console.log(JSON.stringify(data));
        handleEvent(data);
      })
    }else{
      console.log("==================dang nhap that bai ahihihih");
    }
  })
});
// socket.on("disconnect", () => console.log('Disconnected'));
// socket.on("subscribeFail", err => console.log("subcrible fail" + err));
// socket.on("handshakeRTC", data => console.log(data + ""));
socket.on("error", (err) =>  console.log(err)); 


const configuration = {
  iceServers: [
    { urls: "stun:stun.1.google.com:19302" },
    /*{ 'urls': 'stun:stun1.l.google.com:19302' },
     { 'urls': 'stun:stun2.l.google.com:19302' },
     { 'urls': 'stun:stun3.l.google.com:19302' },
     { 'urls': 'stun:stun4.l.google.com:19302' },*/
  ],
};

const constrains = {
  audio: true,
  video: true,
};

const p = document.querySelector("p");
const localVideo = document.getElementById("localVideo");
const remoteViewContainer = document.getElementById("remoteViewContainer");

let pcPeers = {};
let localStream;

/* ==============================
 Socket Functionality
 ================================ */
//socket.on('connect', async () => await getLocalStream());
//socket.on('exchange', data => exchange(data));
//socket.on('leave', socketId => leave(socketId));

/* ==============================
 Functions
 ================================ */
async function getLocalStream() { // lấy stream trên trình duyệt local bỏ vào element video
  console.log('get local stream');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constrains);
   
    localStream = stream;
    localVideo.srcObject = stream;
    localVideo.muted = true;
    localVideo.onloadedmetadata = async () => {
      try {
        await localVideo.play();
      } catch (e) {logError(e);}
    };
  } catch (e) {logError(e);}
}

function onPress() {
  console.log('you press the button');
  let roomID = document.getElementById('roomID').value;
  
  if (roomID === "") {
    alert('Please enter room ID!');
  } else {
    let roomIDContainer = document.getElementById('roomIDContainer');
    roomIDContainer.parentElement.removeChild(roomIDContainer);
    
    join(roomID); // hiện tại không dùng roomID
  }
}

// function join(roomID) {
//   let onJoin = socketIds => {
//     for (const i in socketIds) {
//       if (socketIds.hasOwnProperty(i)) {
//         const socketId = socketIds[i];
//         console.log('Socket', socketId);
//         createPC(socketId, true);
//       }
//     }
//   };
  
//   socket.emit('exchange', roomID, onJoin);
// }

function join(roomID) {
  console.log("khoi tao cuoc goi");
  //let data = {to_id: remoteId, from_id: localId, ping: 'ping', to_name:'A', from_name: "B", type: handshakeRTC};
  //console.log(data);
  socket.emit(handshakeRTC, {to_id: remoteId, from_id: localId, ping: 'ping', to_name:'A', from_name: "B", type: handshakeRTC}); // tạo cuộc gọi bằng cách ping qua máy đối tác, nếu đói tác online sẽ có gói tin Pong lại, sau đó sẽ thực hiện cuộc gọi - dòng 135
}

function handleEvent(data) {
  console.log(data);
  const {message, from_id, to_id, from_name, to_name, channel, from_avatar, type, ping, pong, candidate} = data || null;
    if(!message && !pong && !ping){
      exchange(data);
    }
    else if(ping && from_id == remoteId) {
      socket.emit(handshakeRTC, {to_id: remoteId, ping: "ping", from_id: localId, from_name: "A", to_name: "B", type: handshakeRTC});
    }
    else if(pong && from_id == remoteId) {
      //socket.emit(handshakeRTC, {to_id: 496, from_id: 269, })
      createPC(remoteId, true); // người gọi sẽ có isOffer là true, người nhận sẽ tạo gói tin answer, isOffer là false
    }
}

function createPC(socketId, isOffer) {
  const pc = new RTCPeerConnection(configuration);
  console.log('create pc');
  
  pcPeers = {
    ...pcPeers,
    [socketId]: pc,
  };
  
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  
  pc.onicecandidate = event => { 
    console.log('onicecandidate');
    console.log(event);
    if (event.candidate) {
      socket.emit(handshakeRTC, { to_id : remoteId, candidate: event.candidate, from_id: localId, to_name: "A", from_name: "B", type: handshakeRTC});
    }
  };
  
  // pc.onnegotiationneeded = async () => {
  //   console.log('onnegotiationneeded');
    
  //   if (isOffer) {
  //     try {
  //       const description = await pc.createOffer();
  //       await pc.setLocalDescription(description);
        
  //       socket.emit(handshakeRTC, { to_id: remoteId, from_id: localId, sdp: pc.localDescription, to_name: 'A', from_name: 'B', type: handshakeRTC});
  //     } catch (e) {logError(e);}
      
  //   }
  // };
  let negotiating = false;
  pc.onnegotiationneeded = async e => {
    try {
      if (negotiating) {
        console.log("======================SKIP nested negotiations");
        return;
      } // lỗi của trình duyệt chrome, thêm dòng này nhưng chưa biết chính xác lỗi là gì 
      negotiating = true;
        console.log('onnegotiationneeded');
        if (isOffer) {
          try {
            const description = await pc.createOffer();
            await pc.setLocalDescription(description);
            socket.emit(handshakeRTC, { to_id: remoteId, from_id: localId, sdp: pc.localDescription, to_name: 'A', from_name: 'B', type: handshakeRTC});
          } catch (e) {logError(e);}    
    }
    } finally {
      console.log("=================finshied negotiationeeded");
    }
  }
  pc.oniceconnectionstatechange = event => {
    console.log('oniceconnectionstatechange');
    if (pc.iceConnectionState === 'connected') {
      console.log('connected', event);
    }
  };
  
  pc.onsignalingstatechange = event => {
    //console.log('onsignalingstatechange', event);
    console.log('===================signalingState', pc.signalingState);
    negotiating = (pc.signalingState != "stable");
  };
  
  pc.ontrack = event => {
    let video = document.createElement('video');
    video.id = "remoteView" + socketId;
    
    video.autoplay = true;
    video.loop = true;
    video.playsinline = true;
    video.load();
    video.controls = true;
    
    let isPlaying = video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2;
    
    // Check if video isn't playing
    if (!isPlaying) {
      // Doesn't duplicate same stream
      if (video.srcObject !== event.streams[0]) {
        video.srcObject = event.streams[0];
        /*localVideo.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (e) {logError(e);}
        };*/
      }
    }
    
    // Console on site for webview debug
    p.innerHTML += `<br> is stream active? ${event.streams[0].active}`;
    p.innerHTML += `<br> stream id: ${event.streams[0].id}`;
    console.log(event.streams);
    
    playVideo(video);
  };
  
  return pc;
}

function playVideo(video) {
  remoteViewContainer.appendChild(video);
  p.innerHTML += `<br> asdf`;
  setTimeout(() => video.play(), 3000);
}

async function exchange(data) {
  // let pc;
  let fromId = data.from_id;
  let pc = pcPeers[fromId] || (await createPC(fromId, false));
  // if (remoteId in pcPeers) {
  //   pc = pcPeers[remoteId];
  // } else {
  //   pc = createPC(remoteId, false);
  // }
  
  if (data.sdp) {
    const remoteOffer = new RTCSessionDescription(data.sdp); // tạo session của remote sau đó thêm vào localsession  dòng 260
    
    console.log('exchange sdp', data);
    console.log('remoteOffer:\n', remoteOffer);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp)); 
      console.log('setRemoteDescription ok');
      
      if (pc.remoteDescription.type === "offer") {
        const description = await pc.createAnswer();
        await pc.setLocalDescription(description);
        
        console.log('createAnswer:\n', description);
        socket.emit(handshakeRTC, { to_id: fromId, from_id: localId, sdp: pc.localDescription, from_name: "A", to_name: "B", type: handshakeRTC });
      }
    } catch (e) {console.log(e);}
    
  } else {
    console.log('exchange candidate', data);
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    // try {
    //   await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    // } catch (e) {logError(e);}
  }
}

function leave(socketId) {
  //console.log('leave', socketId);
  
  const peer = pcPeers[socketId];
  
  peer.close();
  
  delete pcPeers[socketId];
  
  let video = document.getElementById("remoteView" + socketId);
  
  if (video) video.remove();
}

function logError(error) {
  console.log('\n\n%c START ________________________ Log Error ______________________', ' color: red; font-size: 15px');
  //console.log(error + '\n\n');
  console.log(error.toString() + '\n\n');
  console.trace();
  console.log('%c END __________________________ Log Error ______________________\n\n', 'color: red; font-size: 15px');
}


function testChat() { // test chat xem socket có hoạt động hay không
  socket.emit("clientMsg", {
    message: "asdjasdasd",
    from_id: localId,
    to_id: remoteId,
    from_name: "A",
    to_name: "B",
    type: "clientMsg"
  })
}