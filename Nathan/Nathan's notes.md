20260818

* Saw in PRIOR-ART.md from the product folder that https://github.com/OpenTracksApp/OpenTracks is mentioned, since it is a GitHub repo it could be interesting to clone it and see if there is something of interest of us
* Overall I think there a lot of md files in the product folder that I wonder if they are still needed/useful ? I also see that I dont have a good idea of the current status of next steps, what is logged as important next steps, does it overlap with what my expectations and next steps are ? often time chat response are very technical and reference a lot of file content I have no idea off because I am in more of a manager position,which makes me think of if the project can be simplified in a way.
* In the process folder I was looking at the BETA-TESTERS.md file which contains really useful next steps and important implementations. But these comments were never brought up to me. Which again makes me think that we lack a sense of direction and what to focus on step by step.
* Some fils in the product folder seem really outdated such as the LAYOUT.md file. Some md files in the product folder are ideas not acted upon some are like the backlogs and decisions files which are more active. Overall it needs a restructure and cleanup to move forward properly. Should each folder have its own readme file for quick lookup and efficient navigation ?
* Some feedback for the marketing folder and the html website

  * overall all the outdated specific to me stuff should be removed or at least updated thruthfully

    * for example the "One rider · three tracks · zero rivals" which is directly below the logo is completely outdated; there are more than three tracks. I also think I want it less as agressive ofa communication strategy and more like 1) a bit of self improvement, a bit better everyday by pushing yourself combined with 2) make your daily trajects (so not just commute, but the trajects you take often) a bit more fun, exciting, playful
  * The site says "Turn a repeated bike commute into an F1 qualifying session against yourself. No other riders. No leaderboards. No calories. Just sectors, colour, and the last ten versions of you."

    * I would not mention F1 in any way so people 1) do not expect an F1 experienve fully and might be disappointed and 2) not scare away the non-racing people
    * the three repeated "no" phrases are too strong. And we dont have to be specific about sector colours or anything like that. Just presenting it as turn your daily routes into a fun challenge or compare yourself to your self or something like that
  * Same road. New meaning is perfectly on track with the brand image.
  * The site says "Press START at the door. The lap doesn't begin there — it begins about 162 metres later, at a line only the app can see. You're already at speed when it happens. That's the flying start."

    * again would not go into specifics like 162 meters (1) its not always 162 meters and 2) I just wouldn't talk about it anyways) Just saying press start, do your normal route, save it and the next time you do it you have something to race for. If you have already preferred routes, load them in the app and challenge your self directly!
  * I have never been a fan of this whole colour scarcity idea so I think it should be removed entirely from our brand idea and identity.I even pushed away from the dark version and introduced different pallettes to brighten it up. Its just something claude came up with. The reason we use colours is because it is easy, intuitive and relatable to something that exists. I am happy with the current night and day designs and they could be expanded with more themes in the future as well.
  * Once you start scrolling down the site the Q and Qualifire name disappear and are never seen again. In some websites when you scroll down, they still show a fixed ribbon, we should have this with the logo, name + a "download app" or "try it out" button ?
* I am a bit confused with demos\\ways folder:

  * I felt like I did a pass through all the routes it showed and annotated them as to which one I want to use but it has not stuck yet into the app the way I wanted it too.
  * So lets see what is missing and how I can work on it effectively, ideally I should have an option to work on the routes and then save my work back in away that claude can see it.

    * for example I want to agree on reference routes for each 2 landmark combination
    * I also want to agree on fixed gates for each route (should have a way to drag and position them all and then save them so claude knows what I actually want)
    * I also have the idea of some gates being shared. Because the routes to home for example overlap if you come from work, station or fosh. So ideally you want the routes closer to home with fixed shared gates that can be picked up coming from different initial starts.
    * Should also have a free ride option in the app so you can ride without a preset route to

      * 1\) ride freely for short non-raceable segments, or together with a friend
      * 2\) have the option to ride a route that could be added in the future (set a reference for it too implement later), dont know how to call it? maybe a seed ride or ref ride ?
    * I also feel like I am not knowledgable enough in the way that the routes, gates and map overlay features work. What is real what is more like a trick (like is it a fake route overlay and then the live data is used to make It look like you are on the route, or is it real ? I also see I am often labeled as "off route" by the app while I am perfectly on it)
* I feel like the C:\\Users\\natha\\Claude personal projects\\Qualifire\\data\\analysis folder lacks implementation in the current app

  * when I did some test rides my ghosts were some random rides instead of using the actual ride history which is fully loaded;i have also uploaded all the current in app rides so the app can stay up to date with quick refreshes carrying the real data. And I agree with one of the BETA-TESTERS point about a lack of previous rides and looking back features that are currently non-existent while all the data is literally there
  * also I had no feedback on these TEST in app rides;is the data good, did the gps and logging work properly ? Is it comparable to the quality of data that you would get from the strava gpx export ? How about trying my gpx+ idea, and can I test it immediately ?
* for the app folder I have overall little knowledge of how it is made up, what are its components ?For example sometime claude references the "store" but I have no idea what it is

