function AudioHandler() {

  this.hasAudio = true;
  let Ac = window.AudioContext || window.webkitAudioContext;
  this.sampleBufferL = new Float64Array(735);
  this.sampleBufferR = new Float64Array(735);

  if(Ac === undefined) {
    log("Audio disabled: no Web Audio API support");
    this.hasAudio = false;
  } else {
    this.actx = new Ac();
    log("Audio initialized, sample rate: " + this.actx.sampleRate);

    this.inputBufferL = new Float64Array(4096);
    this.inputBufferR = new Float64Array(4096);
    this.inputBufferPos = 0;
    this.inputReadPos = 0;

    this.scriptNode = undefined;
    this.isStarted = false; // Track if audio is started
  }

  this.resume = function() {
    // for Chrome autoplay policy
    if(this.hasAudio && this.actx.state === 'suspended') {
      console.log("Resuming audio context...");
      return this.actx.resume();
    }
    return Promise.resolve();
  }

  this.start = function() {
    if(this.hasAudio && !this.isStarted) {
      console.log("Starting audio processor...");
      
      // First resume the context if suspended
      this.resume().then(() => {
        this.scriptNode = this.actx.createScriptProcessor(2048, 0, 2);
        let that = this;
        this.scriptNode.onaudioprocess = function(e) {
          that.process(e);
        }

        this.scriptNode.connect(this.actx.destination);
        this.isStarted = true;
        console.log("Audio processor started successfully");
      }).catch(err => {
        console.error("Failed to start audio:", err);
      });
    }
  }

  this.stop = function() {
    if(this.hasAudio && this.isStarted) {
      console.log("Stopping audio processor...");
      if(this.scriptNode) {
        this.scriptNode.disconnect();
        this.scriptNode = undefined;
      }
      this.inputBufferPos = 0;
      this.inputReadPos = 0;
      this.isStarted = false;
    }
  }

  this.process = function(e) {
    if(this.inputReadPos + 2048 > this.inputBufferPos) {
      // we overran the buffer
      // log("Audio buffer overran");
      this.inputReadPos = this.inputBufferPos - 2048;
      if(this.inputReadPos < 0) this.inputReadPos = 0;
    }
    if(this.inputReadPos + 4096 < this.inputBufferPos) {
      // we underran the buffer
      // log("Audio buffer underran");
      this.inputReadPos += 2048;
    }
    let outputL = e.outputBuffer.getChannelData(0);
    let outputR = e.outputBuffer.getChannelData(1);
    for(let i = 0; i < 2048; i++) {
      outputL[i] = this.inputBufferL[this.inputReadPos & 0xfff];
      outputR[i] = this.inputBufferR[this.inputReadPos & 0xfff];
      this.inputReadPos++;
    }
  }

  this.nextBuffer = function() {
    if(this.hasAudio) {
      for(let i = 0; i < 735; i++) {
        let valL = this.sampleBufferL[i];
        let valR = this.sampleBufferR[i];
        this.inputBufferL[this.inputBufferPos & 0xfff] = valL;
        this.inputBufferR[this.inputBufferPos & 0xfff] = valR;
        this.inputBufferPos++;
      }
    }
  }

  // Add method to ensure audio starts on user interaction
  this.ensureStarted = function() {
    if(this.hasAudio && !this.isStarted) {
      this.start();
    }
  }
}