export function test_compatability(){
    test_mobile()
}

function test_mobile(){
    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        throw "Sorry, mobile browsers aren't supported yet -\n please try again on a desktop browser, or check back soon for mobile support!"
    }
}

