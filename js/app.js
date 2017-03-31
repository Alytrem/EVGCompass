(function () {
  "use strict";

  //set to true for debugging output
  var debug = false;

  // our current position
  var positionCurrent = {
    lat: null,
    lng: null,
    hng: null
  };

  var targetDistance = 0;
  var targetDirection = 0;


  // the outer part of the compass that rotates
  var rose = document.getElementById("rose");
  // the inner part of the compass that direct to the objective
  var pointer = document.getElementById("pointer");


  // elements that ouput our position
  var positionLat = document.getElementById("position-lat");
  var positionLng = document.getElementById("position-lng");
  var positionHng = document.getElementById("position-hng");
  var positionDist = document.getElementById("position-dist");


  // debug outputs
  var debugOrientation = document.getElementById("debug-orientation");
  var debugOrientationDefault = document.getElementById("debug-orientation-default");


  // info popup elements, pus buttons that open popups
  var popup = document.getElementById("popup");
  var popupContents = document.getElementById("popup-contents");
  var popupInners = document.querySelectorAll(".popup__inner");
  var btnsPopup = document.querySelectorAll(".btn-popup");


  // buttons at the bottom of the screen
  var btnLockOrientation = document.getElementById("btn-lock-orientation");
  var btnNightmode = document.getElementById("btn-nightmode");
  var btnMap = document.getElementById("btn-map");
  var btnInfo = document.getElementById("btn-info");


  // if we have shown the heading unavailable warning yet
  var warningHeadingShown = false;


  // switches keeping track of our current app state
  var isOrientationLockable = false;
  var isOrientationLocked = false;
  var isNightMode = false;


  // the orientation of the device on app load
  var defaultOrientation;


  // browser agnostic orientation
  function getBrowserOrientation() {
    var orientation;
    if (screen.orientation && screen.orientation.type) {
      orientation = screen.orientation.type;
    } else {
      orientation = screen.orientation ||
        screen.mozOrientation ||
        screen.msOrientation;
    }

    /*
      'portait-primary':      for (screen width < screen height, e.g. phone, phablet, small tablet)
                                device is in 'normal' orientation
                              for (screen width > screen height, e.g. large tablet, laptop)
                                device has been turned 90deg clockwise from normal

      'portait-secondary':    for (screen width < screen height)
                                device has been turned 180deg from normal
                              for (screen width > screen height)
                                device has been turned 90deg anti-clockwise (or 270deg clockwise) from normal

      'landscape-primary':    for (screen width < screen height)
                                device has been turned 90deg clockwise from normal
                              for (screen width > screen height)
                                device is in 'normal' orientation

      'landscape-secondary':  for (screen width < screen height)
                                device has been turned 90deg anti-clockwise (or 270deg clockwise) from normal
                              for (screen width > screen height)
                                device has been turned 180deg from normal
    */

    return orientation;
  }


  // browser agnostic orientation unlock
  function browserUnlockOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    } else if (screen.unlockOrientation) {
      screen.unlockOrientation();
    } else if (screen.mozUnlockOrientation) {
      screen.mozUnlockOrientation();
    } else if (screen.msUnlockOrientation) {
      screen.msUnlockOrientation();
    }
  }


  // browser agnostic document.fullscreenElement
  function getBrowserFullscreenElement() {
    if (typeof document.fullscreenElement !== "undefined") {
      return document.fullscreenElement;
    } else if (typeof document.webkitFullscreenElement !== "undefined") {
      return document.webkitFullscreenElement;
    } else if (typeof document.mozFullScreenElement !== "undefined") {
      return document.mozFullScreenElement;
    } else if (typeof document.msFullscreenElement !== "undefined") {
      return document.msFullscreenElement;
    }
  }


  // browser agnostic document.documentElement.requestFullscreen
  function browserRequestFullscreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  }


  // browser agnostic document.documentElement.exitFullscreen
  function browserExitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }


  // called on device orientation change
  function onHeadingChange(event) {
    var heading = event.alpha;

    if (typeof event.webkitCompassHeading !== "undefined") {
      heading = -event.webkitCompassHeading; //iOS non-standard
    }

    var orientation = getBrowserOrientation();

    if (typeof heading !== "undefined" && heading !== null) { // && typeof orientation !== "undefined") {
      // we have a browser that reports device heading and orientation


      if (debug) {
        debugOrientation.textContent = orientation;
      }


      // what adjustment we have to add to rotation to allow for current device orientation
      var adjustment = 0;
      if (defaultOrientation === "landscape") {
        adjustment -= 90;
      }

      if (typeof orientation !== "undefined") {
        var currentOrientation = orientation.split("-");

        if (defaultOrientation !== currentOrientation[0]) {
          if (defaultOrientation === "landscape") {
            adjustment -= 270;
          } else {
            adjustment -= 90;
          }
        }

        if (currentOrientation[1] === "secondary") {
          adjustment -= 180;
        }
      }

      positionCurrent.hng = heading + adjustment;

      var phase = positionCurrent.hng < 0 ? 360 + positionCurrent.hng : positionCurrent.hng;
      positionHng.textContent = (360 - phase | 0) + "°";


      // apply rotation to compass rose
      if (typeof rose.style.transform !== "undefined") {
        rose.style.transform = "rotateZ(" + positionCurrent.hng + "deg)";
      } else if (typeof rose.style.webkitTransform !== "undefined") {
        rose.style.webkitTransform = "rotateZ(" + positionCurrent.hng + "deg)";
      }
      // apply rotation to the compass pointer
      if (typeof pointer.style.transform !== "undefined") {
        pointer.style.transform = "rotateZ(" + (positionCurrent.hng + targetDirection) + "deg)";
      } else if (typeof rose.style.webkitTransform !== "undefined") {
        pointer.style.webkitTransform = "rotateZ(" + (positionCurrent.hng + targetDirection) + "deg)";
      }
    } else {
      // device can't show heading

      positionHng.textContent = "n/a";
      showHeadingWarning();
    }
  }

  function showHeadingWarning() {
    if (!warningHeadingShown) {
      popupOpen("noorientation");
      warningHeadingShown = true;
    }
  }

  function onFullscreenChange() {
    if (isOrientationLockable && getBrowserFullscreenElement()) {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock(getBrowserOrientation()).then(function () {
        }).catch(function () {
        });
      }
    } else {
      lockOrientationRequest(false);
    }
  }

  function toggleOrientationLockable(lockable) {
    isOrientationLockable = lockable;

    if (isOrientationLockable) {
      btnLockOrientation.classList.remove("btn--hide");

      btnNightmode.classList.add("column-25");
      btnNightmode.classList.remove("column-33");
      btnMap.classList.add("column-25");
      btnMap.classList.remove("column-33");
      btnInfo.classList.add("column-25");
      btnInfo.classList.remove("column-33");
    } else {
      btnLockOrientation.classList.add("btn--hide");

      btnNightmode.classList.add("column-33");
      btnNightmode.classList.remove("column-25");
      btnMap.classList.add("column-33");
      btnMap.classList.remove("column-25");
      btnInfo.classList.add("column-33");
      btnInfo.classList.remove("column-25");
    }
  }

  function checkLockable() {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock(getBrowserOrientation()).then(function () {
        toggleOrientationLockable(true);
        browserUnlockOrientation();
      }).catch(function (event) {
        if (event.code === 18) { // The page needs to be fullscreen in order to call lockOrientation(), but is lockable
          toggleOrientationLockable(true);
          browserUnlockOrientation(); //needed as chrome was locking orientation (even if not in fullscreen, bug??)
        } else {  // lockOrientation() is not available on this device (or other error)
          toggleOrientationLockable(false);
        }
      });
    } else {
      toggleOrientationLockable(false);
    }
  }

  function lockOrientationRequest(doLock) {
    if (isOrientationLockable) {
      if (doLock) {
        browserRequestFullscreen();
        lockOrientation(true);
      } else {
        browserUnlockOrientation();
        browserExitFullscreen();
        lockOrientation(false);
      }
    }
  }

  function lockOrientation(locked) {
    if (locked) {
      btnLockOrientation.classList.add("active");
    } else {
      btnLockOrientation.classList.remove("active");
    }

    isOrientationLocked = locked;
  }

  function toggleOrientationLock() {
    if (isOrientationLockable) {
      lockOrientationRequest(!isOrientationLocked);
    }
  }

  function locationUpdate(position) {
    positionCurrent.lat = position.coords.latitude;
    positionCurrent.lng = position.coords.longitude;

    positionLat.textContent = decimalToSexagesimal(positionCurrent.lat, "lat");
    positionLng.textContent = decimalToSexagesimal(positionCurrent.lng, "lng");

    updateDirectionAndDistance();
  }

  function locationUpdateFail(error) {
    positionLat.textContent = "n/a";
    positionLng.textContent = "n/a";
    console.log("location fail: ", error);
  }

  function setNightmode(on) {

    if (on) {
      btnNightmode.classList.add("active");
    } else {
      btnNightmode.classList.remove("active");
    }

    window.setTimeout(function () {
      if (on) {
        document.documentElement.classList.add("nightmode");
      } else {
        document.documentElement.classList.remove("nightmode");
      }
    }, 1);


    isNightMode = on;
  }

  function toggleNightmode() {
    //setNightmode(!isNightMode);

  }

  function openMap() {
    window.open("https://www.google.com/maps/place/@" + positionCurrent.lat + "," + positionCurrent.lng + ",16z", "_blank");
  }

  function popupOpenFromClick(event) {
    popupOpen(targetPoint.popup);
  }

  function popupOpen(name) {
    var i;
    for (i = 0; i < popupInners.length; i++) {
      popupInners[i].classList.add("popup__inner--hide");
    }
    document.getElementById("popup-inner-" + name).classList.remove("popup__inner--hide");

    popup.classList.add("popup--show");
  }

  function popupClose() {
    popup.classList.remove("popup--show");
  }

  function popupContentsClick(event) {
    event.stopPropagation();
  }

  function decimalToSexagesimal(decimal, type) {
    var degrees = decimal | 0;
    var fraction = Math.abs(decimal - degrees);
    var minutes = (fraction * 60) | 0;
    var seconds = (fraction * 3600 - minutes * 60) | 0;

    var direction = "";
    var positive = degrees > 0;
    degrees = Math.abs(degrees);
    switch (type) {
      case "lat":
        direction = positive ? "N" : "S";
        break;
      case "lng":
        direction = positive ? "E" : "W";
        break;
    }

    return degrees + "° " + minutes + "' " + seconds + "\" " + direction;
  }

  if (screen.width > screen.height) {
    defaultOrientation = "landscape";
  } else {
    defaultOrientation = "portrait";
  }
  if (debug) {
    debugOrientationDefault.textContent = defaultOrientation;
  }

  window.addEventListener("deviceorientation", onHeadingChange);

  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  document.addEventListener("mozfullscreenchange", onFullscreenChange);
  document.addEventListener("MSFullscreenChange", onFullscreenChange);

  btnLockOrientation.addEventListener("click", toggleOrientationLock);
  btnNightmode.addEventListener("click", toggleNightmode);
  btnMap.addEventListener("click", openMap);

  var i;
  for (i = 0; i < btnsPopup.length; i++) {
    btnsPopup[i].addEventListener("click", popupOpenFromClick);
  }

  popup.addEventListener("click", popupClose);
  popupContents.addEventListener("click", popupContentsClick);

  navigator.geolocation.watchPosition(locationUpdate, locationUpdateFail, {
    enableHighAccuracy: true,
    maximumAge: 20000,
    timeout: 17000
  });

  setNightmode(false);
  checkLockable();

  // custom

  var points = [
    {
      "name": "Niji",
      "popup": "creperie",
      "lat": 48.1147972,
      "lng": -1.6175523
    },
    {
      "name": "Drive",
      "popup": "felix",
      "lat": 48.1078759,
      "lng": -1.6177113
    },
    {
      "name": "Appart",
      "popup": "mail",
      "lat": 48.1195776,
      "lng": -1.5988582
    },{
      "name": "Ker-Soazig",
      "popup": "creperie",
      "lat": 48.105735,
      "lng": -1.6774227
    },
    {
      "name": "Restaurant Le Felix",
      "popup": "felix",
      "lat": 48.1062418,
      "lng": -1.6801678
    },
    {
      "name": "Ancien appartement",
      "popup": "mail",
      "lat": 48.1094926,
      "lng": -1.6897712
    },
    {
      "name": "La croix",
      "popup": "croix",
      "lat": 48.1102989,
      "lng": -1.6866736
    },
    {
      "name": "Place Jacquet",
      "popup": "jacquet",
      "lat": 48.1128556,
      "lng": -1.6802298
    },
    {
      "name": "Le petit vélo",
      "popup": "velo",
      "lat": 48.1136257,
      "lng": -1.6818698
    },
    {
      "name": "Le ty bulle",
      "popup": "bulle",
      "lat": 48.1074262,
      "lng": -1.6716965
    },
    {
      "name": "Laser Game",
      "popup": "laser",
      "lat": 48.1142391,
      "lng": -1.5902132
    }
  ];

  var targetPoint = null;
  var targetPointIndex = 0;
  function defineTargetPoint(point) {
    targetPoint = point;
    console.log("switching to point n°", targetPointIndex, targetPoint);
    popupOpen(targetPoint.popup);
  }

  // selecting the initial point
  var hash = window.location.hash.split('#')[1];
  if (hash >= 0 && points[hash]) {
    targetPointIndex = hash;
  } else if (localStorage.targetPointIndex && points[localStorage.targetPointIndex]) {
    targetPointIndex = localStorage.targetPointIndex;
  } else {
    targetPointIndex = 0;
  }
  localStorage.targetPointIndex = targetPointIndex;
  defineTargetPoint(points[targetPointIndex]);

  console.log(points);

  // Converts from degrees to radians.
  Math.radians = function (degrees) {
    return degrees * Math.PI / 180;
  };

  // Converts from radians to degrees.
  Math.degrees = function (radians) {
    return radians * 180 / Math.PI;
  };

  /**
   * Compute the distance in meters
   */
  var getDistance = function (p1, p2) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = Math.radians(p2.lat - p1.lat);
    var dLong = Math.radians(p2.lng - p1.lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(Math.radians(p1.lat)) * Math.cos(Math.radians(p2.lat)) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
  };

  /**
 * Params: p1 => current point
 *         p2 => target  point
 * 
 * Returns the degree of a direction from current point to target point
 *
 */
  function getDegrees(p1, p2) {
    var lat1 = p1.lat;
    var lon1 = p1.lng;
    var lat2 = p2.lat;
    var lon2 = p2.lng;

    var dLat = Math.radians(lat2 - lat1);
    var dLon = Math.radians(lon2 - lon1);

    lat1 = Math.radians(lat1);
    lat2 = Math.radians(lat2);

    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    var brng = Math.degrees(Math.atan2(y, x));

    // fix negative degrees
    if (brng < 0) {
      brng = 360 - Math.abs(brng);
    }

    return brng;
  }
  var timeout = null;
  window.updateDirectionAndDistance = function () {
    // update distance
    targetDistance = getDistance(positionCurrent, targetPoint);
    positionDist.textContent = Math.round(targetDistance / 10) * 10 + " m";
    console.log(targetDistance, "distance");
    // update orientation
    targetDirection = getDegrees(positionCurrent, targetPoint);
    console.log(targetDirection, "orientation");
    setObjectiveDirection(targetDirection);
    // check proximity
    if (targetDistance < 50) {
      if (!timeout) {
        console.log("Congratulation, < 50m");
        popupOpen(targetPoint.popup + "-success");
        timeout = setTimeout(
          function () {
            targetPointIndex++;
            localStorage.targetPointIndex = targetPointIndex;
            defineTargetPoint(points[targetPointIndex]);
            updateDirectionAndDistance();
            timeout = null;
          }, 10000);
      }
    }
  }

  window.setObjectiveDirection = function (direction) {
    var correctedDirection = positionCurrent.hng + direction;

    // apply rotation to compass pointer
    if (typeof pointer.style.transform !== "undefined") {
      pointer.style.transform = "rotateZ(" + correctedDirection + "deg)";
    } else if (typeof pointer.style.webkitTransform !== "undefined") {
      pointer.style.webkitTransform = "rotateZ(" + correctedDirection + "deg)";
    }
  }

} ());