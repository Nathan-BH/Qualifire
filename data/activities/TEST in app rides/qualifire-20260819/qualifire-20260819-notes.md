Every ride today was made on the "Qualifire preview" standalone app.

* Ride 1 at 11:55

  * Test ride to work, route B, the wet route because it was raining. I had an issue were my bike chain came off, so I was paused for a long time. I pressed the pause button I believe but I dont know if it actually changes something to the gpx data ? That's why the gpx+ implementation is a must so everything can be logged.This will improve the app a lot quickly.
  * I also saw that I was often a bit offset of the route line, the reason is the current morning to work route B is a reversal of the evening route B. But bikes ride on opposite side of the roads so I could see I was a riding a bit to the right of the drawn line. I suggest we take this ride as a reference for a new line of the morning route B to work. "h>>w-w"
* Ride 2 at 16:54

  * More of a free ride, leaving work to an unkown location, was there for a visit. Logged into the app. If I had gpx+ could have been interesting to see what the app logs as events happening.
* Ride 3 at 20:25

  * Was at station and wanted to go home. So I selected that ride, preview was shown but as of current version this route is not implemented yet with live gates in race mode. But I still had the yellow reference line which followed the route correctly as I rode.
  * Close to work it picked up on the work>>home evening route B and just started logging sectors from there. Which is good, but should hopefully not happen once the full station >> home ride is implemented
  * This ride should be the reference station>>home wet ride (because of raining, I avoided all the dirtpads and stayed on asphalt). For short "s>>h-w" (station>>home-wet)



1. Overall the next big implementation should be gpx+ so every in app event can be logged and analyzed. When start/pause/end are pressed, what the app is feeling (gps live or not, off road or not (where and when), any issue that it experiences can be logged as well, every sector or gate or whole route detected)
2. I should also ASAP be able to pick a single ride as reference rides for every route I want

   1. This should be stored in a new folder (so the ref gpx can be copied there and annotated as the new reference for a specific route, and give it a shortname so it can easily be referenced in claude convos such as 'h>>w-w' or "f>>w-d" for a fosh>>work-dry route for example) and then I should be able to have a preview of the route + where the gates are + handles to drag each gate. Each gate position should be expressed as a percentage of the completed route (to easily be able to communicate to claude where I want the gates to be).
   2. I should be able to drag each handle and save their end percentage position, for example: G1-5%;G2-34%,G3-67%;G4-95%. This looks like a simple way to agree on where to place the handles
3. Some other minor thing that should be handled is a consensus of the race mode moving dot, think about how we actually want to show it

   1. now I have a grey dot sometimes, but it turns yellow as well, on a yellow track, with black circles for gates. But the black circles are almost invisibles when in "night mode". I think the gates being circles do not make sense, way simpler is just a small line across the route.
   2. Also maybe the road ahead should be dotted line and then the road behind me completed could be a full line. Makes it easier + the roead looks more like a suggestion route instead of a fixed ride

      1. This ties into an idea I had of having multiple options for certain routes (so inside a "f>>s-d1" you could have a route1 and route2 which differ maybe only in one street or turn somewhere in the middle, but still an idea and not a priority). So the dotted lines could split and only the actual taken route gets drawn over.
4. When ride3 picked up the w>>h-w route i was thinking about trying a new version of the app where instead of routes you haved "gates" scattered on the routes i take often, and they just get activated when i pass through them and compute section times like that

   1. i wonder with if the quick refresh options we could test it out. So the idea is not to code over the existing frameworks but have a separate route design to try out. And they live side by side so we can test it all out before deciding on a single one.
5. I think overall once the reference roads are fixed it would be good to be able to talk about points on routes as percentages for easy communication. For example the dry route crosses train tracks in two locations which makes it very variable, but i dont know how to point claude to these points, so if i have an easy percentage slider on the routes i can drag it and then talk to claude about a specific percentage point

