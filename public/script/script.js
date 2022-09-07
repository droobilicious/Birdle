
function showMessage(text){

    let message = $( '<div>' )
                    .addClass('message-wrapper')
                    .append( 
                            $('<div>')
                            .addClass('message-innerwrap')
                            .html(text)
                     )
                    .appendTo("body");

    $(message).fadeOut(3000, function() { 
        $(this).remove(); 
    }); 

}



$(document).ready(function(){
    
    //header icon actions
        $('.btnInfo').click(function(){
            $('#overlay_info').removeClass('hidden');
        });

        $('.btnHelp').click(function(){
            $('#overlay_help').removeClass('hidden');
        });

        $('.btnLove').click(function(){
            $('#overlay_love').removeClass('hidden');
        });

        $('.btnStats').click(function(){
            $('#overlay_stats').removeClass('hidden');
        });

    //other buttons
    
        $('.btnShare').click(function(){
            console.log("Running share");

            let isMobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) );
            let shareViaClipboard = true;
            let shareText = g.getShareInformation();

            if (isMobile === true){

                shareViaClipboard = false;
                let shareData = {
                    title: 'Lyricle',
                    text: shareText
                  }
                //url: 'https://lyricle.isnow.online'

                navigator.share(shareData)
                         .then(() => console.log("Shared") ) 
                         .catch((error) => {
                            console.log('Sharing Error: ' + error);
                            shareViaClipboard = true;
                         });
               
            }

       
            if (shareViaClipboard === true){
                let temp = $("<textarea>");
               
                $("body").append(temp);
                temp.val(shareText).select();
                document.execCommand("copy");
                temp.remove();
                
                showMessage('Copied to clipboard');

            }

                          
        });

       



    //overlays

        //hide overlays on click
        $('.overlay-wrapper').click(function(){
            $(this).addClass('hidden');
        })

        //overlay buttons
        $('#btnTest').click(function(event){
            event.stopPropagation(); //dont fire parent click events
        })



    //check for first run
    if (localStorage.getItem("firstRun") === null) {
        //first run. show help
        $('#overlay_help').removeClass('hidden');

        //set first run as being complete
        localStorage.setItem("firstRun", false);
    }




    //game
    const g = Object.create(game); 
    g.start({
        gameDataLocation : "./config1.json",
        gameCanvasSelector : '#gamecanvas',
        localStorageName : "birdle1",
        guessListSelector : '#guessWrapper',
        searchWrapper : '#searchWrapper',
        guessButtonsWrapper : '#buttonsWrapper',
        guessButtonSelector :   '#btnSubmitGuess',
        skipButtonSelector : '#btnSkipGuess',
        gameSummarySelector : '#summary',
        inputTxtSelector : '#txtGuess'
       
    })
   
    g.onComplete = function(){
        //play song?
    }

    //load  autocomplete list
    let items = [];
    $.get( "./autocomplete.txt")
            .then(function( data ) {
                items = data.split("\n").map(element => {
                    return element.trim();
                }).filter(n => n);

                //configure autocomplete    
                //console.log("songList length " + songList.length);
                $( '#txtGuess' ).searchoptions({
                    resultDisplaysLimit : 6,
                    items : items,
                    submitSelector : '#btnSubmitGuess',
                    onlyAllowItems : true //dont allow to be submitted that arent in the options list
                })
            })
            .fail(function(){
                console.log("An error has occurred.");
            });
   

}); //end of document ready




