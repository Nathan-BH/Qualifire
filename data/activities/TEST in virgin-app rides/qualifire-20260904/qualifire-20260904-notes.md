20260904

* FYI Evening ride was recorded after the whole virgin-cycle1 landed
* Morning ride used the current known route so no issues except the double yellow line overlay but is already set to be handled in virgin-cycle2

  * other small issue is not being able to change gates for current routes yet, only delete options are available from the ROUTES tab.

    * for example for this route, the middle gate is exactly under the bridge where I have no connection, so it would be better for me if I could edit it

      * As per my current convention, if I edit the gate, it should not recalculate, and just say that previous recordings will be lost (starting over basically)
* Before the evening ride I deleted the previous WorkHome way from the ROUTES tab, and selected again WorkHome.

  * At the end it correctly offeremed me to save it + the options to add a specification, which I filled in as "Wet", making an WorkHomeWet route.
  * However at the step of selecting the gates I was disappointed

    * even though I had a proper route it was not an openmap render, so I could not zoom in on the route to see better where my gates were + landmark features they were close to. So this should be improved next.
    * Another thing about the +/- buttons, we should also have the option that if you long press on them, it keeps it selected and increases/decreases the percentage continuously, this avoids having to tap a lot of times if youre making a big change!
    * Also I could only change the middle gates, not the start and finish line
* A general note I have on the openmap renders I have

  * Normally on phone maps if you touch the map with two fingers and rotate them together (counter)clockwise, it turns the map, I see our map do not have this feature, is this by design or omition ?

    * if we do decide to implement it, then we should have the option to switch between: 

      * choosing the map orientation, so keep it as it was last turned with two fingers
      * or what we have now in race mode where the map follows the ride direction, so you are always riding "up" following the path 
      * I believe that's how most app do it (either a fixed orientation or dynamic)
* Some more comments about the user interface

  * What i like about the last implementation is that now on the RIDES tab selecting a ride opens it properly in a new window and i have the option to go back

    * It should be the same for the routes tab, tapping on a "place" or a "way" should open it similarly in a new tab so we have more info on it/features.
  * Lets think about removing all the extra ai clutter text that is in the app, some examples include (but there are probablymore)

    * ROUTES tab

      * "Dormant places keep seeding history...."
      * "Route lines are pre-rendered..."
    * RIDES when opened

      * "Position is a fact; colour is a judgement..."
    * DEMO tab

      * "A real archived commute lap..."
    * SETTINGS

      * i would remove the grey ai explanation with each setting, instead at the end we can add like a question mark, and when you click it it can give the information for each setting (so its available if you need it but not always present once you know what the settings do).


