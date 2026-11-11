//Variabili
var TdC = {}; //Tasso di cambio (1 EUR = X USD)
var DtdC = ""; //Data dell'XML
var Str = document.getElementById("partenza"); //Valuta partenza
var Arv = document.getElementById("arrivo"); //Valuta arrivo
var S = document.getElementById("stato"); //Stato
var Rst = document.getElementById("risultato"); //Risultato

//Menù per scelta valute
function aggiungiValuta(select, valuta) {
  var opt = document.createElement("option");
  opt.value = valuta;
  opt.textContent = valuta;
  select.appendChild(opt);
}

var rqst = new XMLHttpRequest(); //Carica senza ricaricare la pagina
rqst.open("GET", "https://proxy.cors.dev/https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", true); //Leggiamo XML da ECB
rqst.onload = function () { //Arrivo risposta
  if (rqst.status == 200 && rqst.responseXML) { //Se la richiesta è riuscita (status:200) e è stato ricevuto l'XML
    var src = rqst.responseXML.getElementsByTagName("Cube"); //Ricerca nell'XML dei tag "Cube"
    TdC["EUR"] = 1;
    aggiungiValuta(Str, "EUR"); //Inizializza euro, valuta di riferimento per i cambi
    aggiungiValuta(Arv, "EUR");

    for (var i = 0; i < src.length; i++) { //Ciclo per leggere tutte le valute e i relativi tassi di cambio
      var VAL = src[i].getAttribute("currency");
      var CNG = src[i].getAttribute("rate");

      if (VAL && CNG) { //Porta i valori letti nell'XML in valori leggibili
        TdC[VAL] = Number(CNG);
        aggiungiValuta(Str, VAL);
        aggiungiValuta(Arv, VAL);
      }

      if (src[i].getAttribute("time")) {//Recupera la data
        DTdC = src[i].getAttribute("time");
      }
    }

    S.textContent = "Cambi del " + DTdC; //Controllo stato
  } else {
    S.textContent = "Impossibile caricare il file XML.";
  }
};
rqst.onerror = function () { //Controllo COllegamento
  S.textContent = "Errore di collegamento. Riprova più tardi.";
};
rqst.send();

document.getElementById("modulo").onsubmit = function (evento) { //Converte on submit
  evento.preventDefault();
//Legge quantità e valute
  var q = Number(document.getElementById("quantita").value);
  var da = Str.value;
  var a = Arv.value;
//Calcoli
  if (q > 0 && da && a) {
    var convr = q / TdC[da] * TdC[a];
    Rst.textContent = q + " " + da + " = " + convr.toFixed(2) + " " + a;
  }
};
