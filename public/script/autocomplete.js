/*
simple autocomplete options list
*/
$.fn.searchoptions = function(config){

    this.each(function(){

        let txtInput = $(this);

        $(this).css("border","solid green 2px");

        //add container
        let container = $( '<div>' )
            .addClass('autocomplete_wrapper')
            .appendTo (  $(this).parent() );
        
        //move this to it's new container
        $(this).appendTo( container );
        
        //add UL
        let optionslist = $( '<ul>' ).hide().appendTo( container );

        //sort items
        config.items = config.items.sort();

        //items to use in comparisson
        config.compareItemsList = (config.allowCaseDeviation) ? config.items.map(x => x.toUpperCase()) : config.items;
        
        let matchOnEachWord = true;

        //add events
        $(this).on('keyup paste click search mouseup', function(){

            let searchString = $(this).val().trim();
            
            console.log("Autocomplete: searchString text was changed: " + searchString );
    
            //sanitize each search term
            let searchTerms = (matchOnEachWord === true) ? 
                searchString.split(' ').map(item => item
                                                        .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
                                                        .trim()
                                                        .toLowerCase()
                                                        ) :
                [ searchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').trim().toLowerCase()];

            searchTerms = searchTerms.filter(item => item != '');

            //searchTerms = searchTerms.map(item => item.toLowerCase()); 
            console.log("Autocomplete: Search terms: " + JSON.stringify(searchTerms));

            //clear autodiscover results
            $( optionslist ).empty();
                
            if (searchTerms.length > 0){

                //filter results by each search term
                let results = config.items; 
                $.each(searchTerms,function(index, pattern){
                    results = results.filter(item => item.toLowerCase().match(pattern));
                });

                console.log("Autocomplete: Results length: " + results.length + " of " + config.items.length);

                let displayResults = results.slice(0, config.resultDisplaysLimit);
                                
                if (displayResults.length > 0)
                {

                    $.each(displayResults, function(itemindex, item) {
        
                        //**highlight the item text in the searchString

                        $("<li>")
                            .text( item )
                            .click(function(event){
                                console.log("Select: " + $(this).text() + " item: " + item); //
                                $( txtInput ).val( item );
                                $( optionslist ).empty().hide();
                                $( config.submitSelector ).attr("disabled", false);
                            })
                            .appendTo(optionslist);


                    });  //end of for each

                    $( '<div>' )
                        .html("Listing " + displayResults.length 
                                + " of " + results.length 
                                + " results for <b>&ldquo;" + searchString + "&rdquo;</b>" )
                        .appendTo(optionslist);
                }else{
                    $( '<div>' )
                        .html("No results" )
                        .appendTo(optionslist);

                }

                $( optionslist ).show();
                

            }else{
                //hide
                $( optionslist ).hide();     
            }

            // If search value is valid then enable submit button
            if (config.onlyAllowItems){
                
                let lookForString = (config.allowCaseDeviation) ? searchString.toUpperCase() : searchString;
                
                if (config.compareItemsList.indexOf( lookForString ) > -1){
                    //item found
                    $( config.submitSelector ).attr("disabled", false);

                }else{
                    //item not found
                    $( config.submitSelector ).attr("disabled", true);
                }
            }


        }); //end of change event


        //hide autocomplete when clicking elsewhere
        $(document).mouseup(function(e) 
        {
            // if the target of the click isn't the container nor a descendant of the container
            if (!container.is(e.target) && container.has(e.target).length === 0) 
            {
                $( optionslist ).hide();  
            }
        });
        

    });

    return this;

}
