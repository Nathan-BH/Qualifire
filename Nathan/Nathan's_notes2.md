20260819

I have some design ideas that I would like to work see implemented

* I think I lack a lot of control on the design choices. What would be nice is having a folder with svg image recompositions of every tab of the current app (+ also race mode and other things that are rendered in a way). So I could make quick implementations, drag move and add things and claude can directly see the changes and apply them to match my vision. This way I get a more hands-on approach on the design choices
* Looking at strava I saw some features I think would be great for us

  * We have this nice animation which is never visible. Only on fresh launch of the app, but it does not even happen anytime, if you close and reopen it fast or in between apps it does not do it. This animation feels like something important, that you are launching so I would like to see it as well in different ways inside the app

    * So on the RECORD tab, I think the START button should be replaced with a record button. When clicked, it should show the nice animation and then take you to the RACE screen but still not started. There the selected route should be shown with your location and everything set but not started. Then on that screen you can actually press start and start moving
    * At the end when you press stop. It would be nice to show the animation again

      * But maybe it should be reversed: so the yellow line gets undrawn and then the circle gets undrawn as well (lets test it out)
  * I also saw that when you you press record (so not started yet) but you are on the race screen. The other tabs in the footer disappear. So the race screen is more of a "full screen" option that does not allow for other tab browsing. We should have the same feature.
* From a design perspective some tabs do not make sense

  * For the RESULT tab and the RIDES tab

    * It seems it needs to be renamed or rethought or replaced. What do we actually want to show, what is useful ? >> take inspiration from my BETA-TESTERS comments!
    * For example the RIDES tab, the gpx export is a nice feature but not the main feature. The previous rides should be clickable to expand them and look at them properly (the route, sector times etc, ranking and more).
    * The RESULT tab is weird now, just a fixed result. Should it be clickable to see the results for all the routes, or from the last weeks (makes it similar to the RIDES tab then so maybe not). But the current tab design is not appealing nor useful
* In general I also dont know what "fixes"are and why they are logged and shown in the app. Is it something the user should be interested in or is it jist for troubleshooting and making sure the location updates are firing properly ?

