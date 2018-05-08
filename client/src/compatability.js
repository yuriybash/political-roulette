export function test_compatibility(){
    test_mobile();
    test_webrtc_support();
}

function test_mobile(){
    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        throw new Error("Sorry, mobile browsers aren't supported yet -\n please try again on a desktop browser, or check back soon for mobile support!")
    }
}

function test_webrtc_support(){
    if(!navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
        throw new Error("Sorry, your browser doesn't support WebRTC - please try again with a compatibile browser.")
    }
}
