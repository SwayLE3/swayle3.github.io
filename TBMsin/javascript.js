// URL de l'API  
const apiUrl = "https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux/estimated-timetable.json?AccountKey=opendata-bordeaux-metropole-flux-gtfs-rt&LineRef=bordeaux:Line:05:LOC&DirectionRef=0";

// La référence du point d'arrêt que vous recherchez  
const stopPointRefToFind = "bordeaux:StopPoint:BP:7009:LOC";

// Ajouter un événement au bouton
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('boutonLecture').addEventListener('click', lireTexte);
});

// Fonction pour effectuer la requête à l'API et rechercher le point d'arrêt  
async function findStopPointRef(apiUrl, stopPointRef) {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    let closestCall = null;
    let closestTimeDiff = Infinity;
    const journeys = data.Siri.ServiceDelivery.EstimatedTimetableDelivery;

    for (const journey of journeys) {
      const estimatedJourneys = journey.EstimatedJourneyVersionFrame;

      for (const journeyFrame of estimatedJourneys) {
        const estimatedVehicleJourneys = journeyFrame.EstimatedVehicleJourney;

        for (const estimatedJourney of estimatedVehicleJourneys) {
          const estimatedCalls = estimatedJourney.EstimatedCalls.EstimatedCall;

          for (const call of estimatedCalls) {
            for (const call of estimatedCalls) {
              // Vérifie si le StopPointRef correspond et si ExpectedDepartureTime est valide
              if (call.StopPointRef.value === stopPointRef && call.ExpectedDepartureTime) {
                  console.log(call);
                  try {
                    const date = new Date(call.ExpectedDepartureTime);
                    // Vérifie si la date est valide
                    if (!isNaN(date.getTime())) {
                      const currentTime = new Date();
                      const timeDiff = Math.abs(date - currentTime); // Différence absolue en millisecondes
                      
                      // Si cette différence est plus petite que la précédente, on met à jour la "closestCall"
                      if (timeDiff < closestTimeDiff) {
                        closestTimeDiff = timeDiff;
                        closestCall = call;
                      }
                      
                      const closestDate = new Date(closestCall.ExpectedDepartureTime);
                      
                      // Format time with leading zeros
                      const hours = closestDate.getHours();
                      const minutes = closestDate.getMinutes().toString().padStart(2, '0');
                      
                      // Calculate remaining time in minutes (using full millisecond difference)
                      const remainingMs = closestDate - currentTime;
                      const remainingMinutes = Math.floor(remainingMs / 60000);
                      
                      document.getElementById("dateBUS").innerHTML = `${hours}:${minutes}`;
                      document.getElementById("remainingtime").innerHTML = ` ${remainingMinutes} minutes`;
                      
                      console.log("Le départ le plus proche est à", hours, ":", minutes);
                    }
                    else {
                      console.log("ExpectedDepartureTime invalide");
                    }
                  
                  } catch (e) {
                      console.error("Erreur lors du traitement de la date:", e);
                    }
                  }
                }
              }
            }
          }
        }

    return null; // Retourne null si non trouvé  
  } catch (error) {
    console.error("Erreur lors de la récupération des données :", error);
  }
}

setTimeout(() => {
  findStopPointRef(apiUrl, stopPointRefToFind)
}, 10000);

// Appel de la fonction et affichage des résultats  
findStopPointRef(apiUrl, stopPointRefToFind)
  .then(result => {
    if (result) {
      console.log("Point d'arrêt trouvé :", result);
    } else {
      console.log("Point d'arrêt non trouvé !");
    }
  });
