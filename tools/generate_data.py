# ============================================================
# generate_data.py
# Builds the demo dataset used by the Matchday website.
#
#   data/teams-data.js    -> window.MATCHDAY_TEAMS
#   data/players-data.js  -> window.MATCHDAY_PLAYERS
#   data/matches-data.js  -> window.MATCHDAY_DATA  (leagues + matches)
#
# The dataset is deterministic: running the script again produces the
# same clubs, squads and results. It is SAMPLE data for the IICT
# project - scores, tables and player stats are simulated.
# ============================================================
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)

NOW = datetime(2026, 11, 26, 13, 15, tzinfo=timezone.utc)
SEASON = "2026/27"


# ------------------------------------------------------------
# Name pools (invented names that fit each country's naming style)
# ------------------------------------------------------------
POOLS = {
    "english": {
        "first": ["Harry", "Jack", "Oliver", "Callum", "Jordan", "Mason", "Reece", "Ben",
                  "Lewis", "Ethan", "Tyler", "Alfie", "George", "Charlie", "Jacob", "Josh",
                  "Kieran", "Conor", "Aaron", "Dominic", "James", "Luke", "Nathan", "Ryan",
                  "Sam", "Tom", "Will", "Joe", "Max", "Freddie", "Marcus", "Cole"],
        "last": ["Whitfield", "Hartley", "Dawson", "Fletcher", "Mercer", "Ashworth", "Carter",
                 "Ellison", "Fenwick", "Grayson", "Hargreaves", "Ingram", "Jennings", "Kendrick",
                 "Latimer", "Marsden", "Norton", "Oakley", "Preston", "Radcliffe", "Sedgwick",
                 "Thornton", "Underhill", "Vance", "Wardle", "Blake", "Shaw", "Bancroft", "Hollis",
                 "Mott", "Rigby", "Sutcliffe", "Waverley", "Yardley"],
    },
    "spanish": {
        "first": ["Alejandro", "Álvaro", "Bruno", "Carlos", "Diego", "Eduardo", "Fernando",
                  "Gonzalo", "Hugo", "Iker", "Javier", "Marcos", "Mateo", "Nicolás", "Pablo",
                  "Raúl", "Rubén", "Sergio", "Tomás", "Víctor", "Adrián", "Aitor", "Jon", "Mikel",
                  "Unai", "Óscar", "Íñigo", "Julián", "Emilio", "Facundo"],
        "last": ["Beltrán", "Cadenas", "Delgado", "Escobar", "Fuentes", "Gallego", "Herrera",
                 "Iglesias", "Jiménez", "Lozano", "Marín", "Navarro", "Olmedo", "Pardo", "Salas",
                 "Torres", "Uribe", "Zamora", "Aguilar", "Bermejo", "Cabrera", "Domínguez",
                 "Estrada", "Ferrer", "Hidalgo", "Lara", "Molina", "Otero", "Peña", "Quiroga",
                 "Requena", "Sanz", "Vega", "Peralta"],
    },
    "italian": {
        "first": ["Andrea", "Alessandro", "Antonio", "Cristian", "Davide", "Elia", "Federico",
                  "Giacomo", "Giuseppe", "Lorenzo", "Luca", "Marco", "Matteo", "Nicola", "Pietro",
                  "Riccardo", "Roberto", "Salvatore", "Stefano", "Simone", "Tommaso", "Filippo",
                  "Gabriele", "Gianluca", "Mattia", "Michele", "Paolo", "Samuele", "Valentino",
                  "Edoardo"],
        "last": ["Bellini", "Conti", "De Luca", "Esposito", "Ferrari", "Galli", "Greco",
                 "Lombardi", "Mancini", "Moretti", "Neri", "Orlando", "Pellegrini", "Ricci",
                 "Rizzo", "Romano", "Rinaldi", "Santoro", "Serra", "Testa", "Valentini", "Villa",
                 "Barbieri", "Carbone", "Fabbri", "Longo", "Marchetti", "Palmieri", "Vitale",
                 "Costa", "Bianchi", "Amato"],
    },
    "german": {
        "first": ["Leon", "Lukas", "Jonas", "Nico", "Timo", "Felix", "Florian", "Marvin",
                  "Justin", "Kai", "Maximilian", "Moritz", "Niklas", "Philipp", "Robin",
                  "Sebastian", "Sven", "Tobias", "Yannick", "Alexander", "Elias", "Fabian", "Jan",
                  "Julian", "Kevin", "Marc", "Mats", "Paul", "Simon", "Thomas"],
        "last": ["Albrecht", "Bauer", "Brandt", "Dietz", "Engel", "Fischer", "Graf", "Haas",
                 "Hoffmann", "Jäger", "Keller", "Krause", "Lehmann", "Maier", "Neumann",
                 "Ostermann", "Pfeiffer", "Richter", "Schäfer", "Schuster", "Sommer", "Thiele",
                 "Ulrich", "Vogt", "Wagner", "Weber", "Winkler", "Ziegler", "Baumann", "Huber",
                 "Kessler", "Lang"],
    },
    "french": {
        "first": ["Antoine", "Benjamin", "Clément", "Damien", "Étienne", "Florent", "Gaël",
                  "Hugo", "Julien", "Kevin", "Lucas", "Mathis", "Maxime", "Nicolas", "Olivier",
                  "Romain", "Samuel", "Théo", "Valentin", "Yanis", "Adrien", "Bastien", "Enzo",
                  "Grégoire", "Loïc", "Nathan", "Quentin", "Rémi", "Tristan", "Cyril"],
        "last": ["Barbier", "Caron", "Delacroix", "Dubois", "Faure", "Garnier", "Girard",
                 "Lambert", "Laurent", "Marchand", "Mercier", "Moreau", "Petit", "Renard",
                 "Rousseau", "Simon", "Tanguy", "Vasseur", "Chevalier", "Colin", "Dufour",
                 "Fontaine", "Gauthier", "Henry", "Lemaire", "Marchal", "Muller", "Perrin",
                 "Robin", "Blanc", "André", "Charpentier", "Dumont", "Leclerc"],
    },
    "portuguese": {
        "first": ["André", "Bernardo", "Bruno", "Caio", "Daniel", "Diogo", "Eduardo", "Fábio",
                  "Gabriel", "Gonçalo", "Guilherme", "Hugo", "João", "Leonardo", "Lucas", "Luís",
                  "Marcelo", "Matheus", "Miguel", "Nuno", "Pedro", "Rafael", "Rui", "Tiago",
                  "Vasco"],
        "last": ["Almeida", "Barreto", "Campos", "Cardoso", "Carvalho", "Castro", "Correia",
                 "Costa", "Dias", "Ferreira", "Fonseca", "Freitas", "Gomes", "Lopes", "Martins",
                 "Mendes", "Monteiro", "Moreira", "Nascimento", "Neves", "Nunes", "Oliveira",
                 "Pereira", "Pinto", "Ribeiro", "Rocha", "Santos", "Teixeira"],
    },
    "dutch": {
        "first": ["Daan", "Sem", "Lars", "Thijs", "Bram", "Joris", "Koen", "Rick", "Stijn",
                  "Teun", "Wout", "Sven", "Milan", "Ruud", "Jelle", "Niels", "Bart", "Joost",
                  "Jesse", "Tim", "Hugo", "Cas"],
        "last": ["de Vries", "van den Berg", "Jansen", "Bakker", "Visser", "Smit", "de Boer",
                 "Mulder", "Bos", "Vos", "Peters", "Hendriks", "van Leeuwen", "Dekker", "Brouwer",
                 "de Wit", "Dijkstra", "van der Meer", "Kok", "Jacobs", "Prins", "van Loon",
                 "Verhoeven"],
    },
    "nordic": {
        "first": ["Erik", "Magnus", "Jonas", "Anders", "Henrik", "Emil", "Oscar", "Elias",
                  "Viktor", "Mathias", "Kasper", "Mikkel", "Rasmus", "Frederik", "Sander",
                  "Håkon", "Kristian", "Alexander", "Isak", "Ola", "Filip", "Ludvig"],
        "last": ["Andersen", "Berg", "Christensen", "Dahl", "Eriksen", "Fredriksen", "Gustavsson",
                 "Hansen", "Holm", "Isaksen", "Jakobsen", "Johansson", "Karlsen", "Kristiansen",
                 "Larsen", "Lindqvist", "Lund", "Mikkelsen", "Nilsson", "Nyström", "Olsen",
                 "Pedersen", "Sjöberg", "Solberg"],
    },
    "slavic": {
        "first": ["Luka", "Ivan", "Marko", "Nikola", "Stefan", "Petar", "Filip", "Mateo",
                  "Ante", "Matej", "Jan", "Tomáš", "Jakub", "Piotr", "Kacper", "Mateusz",
                  "Aleksandar", "Dušan", "Uroš", "Kristijan", "Dominik", "Adam"],
        "last": ["Babić", "Jurić", "Kovačević", "Marić", "Novaković", "Petrović", "Radić",
                 "Stanković", "Todorović", "Vukić", "Živković", "Horvat", "Kralj", "Novak",
                 "Dvořák", "Černý", "Svoboda", "Kowalski", "Nowak", "Wiśniewski", "Zieliński",
                 "Kamiński", "Adamczyk", "Kaczmarek"],
    },
    "turkish": {
        "first": ["Emre", "Can", "Kerem", "Ahmet", "Mehmet", "Yusuf", "Berk", "Cenk", "Deniz",
                  "Efe", "Enes", "Furkan", "İbrahim", "Kaan", "Mert", "Ozan", "Serkan", "Tolga",
                  "Uğur", "Volkan"],
        "last": ["Aydın", "Yılmaz", "Demir", "Kaya", "Şahin", "Çelik", "Yıldız", "Yıldırım",
                 "Öztürk", "Aydemir", "Polat", "Erdem", "Korkmaz", "Aslan", "Doğan", "Koç",
                 "Kurt", "Özdemir", "Şimşek", "Tekin", "Ünal", "Güler"],
    },
    "japanese": {
        "first": ["Haruto", "Ren", "Yuto", "Sota", "Riku", "Kaito", "Daiki", "Takumi", "Sho",
                  "Hiroto", "Kazuki", "Naoki", "Yuta", "Ryo", "Kota", "Akira", "Tatsuya",
                  "Kenji", "Masaru", "Sora"],
        "last": ["Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi",
                 "Kato", "Yoshida", "Yamada", "Sasaki", "Suzuki", "Matsuda", "Inoue", "Kimura",
                 "Hayashi", "Shimizu", "Mori", "Abe", "Ikeda", "Fujita", "Okada"],
    },
    "korean": {
        "first": ["Min-jun", "Ji-hoon", "Seo-jun", "Hyun-woo", "Dong-hyun", "Tae-yang",
                  "Jae-min", "Sung-ho", "Jin-ho", "Woo-jin", "Jun-seo", "Yu-jun", "Geon-woo",
                  "Seung-min", "Han-bin", "Joon-ho", "Chan-woo", "Do-yun", "Si-woo", "Eun-ho"],
        "last": ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim",
                 "Han", "Oh", "Seo", "Shin", "Kwon", "Hwang", "Ahn", "Moon"],
    },
    "arabic": {
        "first": ["Youssef", "Karim", "Amine", "Yassine", "Bilal", "Ilyas", "Zakaria", "Anas",
                  "Hamza", "Ismael", "Adel", "Faris", "Ibrahim", "Malik", "Nabil", "Omar",
                  "Rayan", "Samir", "Tarek", "Walid"],
        "last": ["El Amrani", "Benali", "Bouazza", "Chahed", "Darwish", "El Sayed", "Fahmy",
                 "Ghali", "Haddad", "Hamdan", "Jaber", "Khazen", "Mansouri", "Naciri", "Othmani",
                 "Qassab", "Rahmani", "Sahli", "Talbi", "Ziani", "Ben Salah", "Trabelsi",
                 "Mansour", "Bouzid"],
    },
}

COUNTRY_POOL = {
    "England": "english", "Scotland": "english", "Ireland": "english", "Wales": "english",
    "United States": "english", "Nigeria": "english", "Ghana": "english",
    "Spain": "spanish", "Argentina": "spanish", "Uruguay": "spanish", "Colombia": "spanish",
    "Mexico": "spanish",
    "Portugal": "portuguese", "Brazil": "portuguese",
    "Italy": "italian",
    "Germany": "german", "Austria": "german", "Switzerland": "german",
    "France": "french", "Belgium": "french", "Senegal": "french", "Morocco": "french",
    "Algeria": "french", "Ivory Coast": "french", "Mali": "french", "Cameroon": "french",
    "Netherlands": "dutch",
    "Norway": "nordic", "Sweden": "nordic", "Denmark": "nordic", "Iceland": "nordic",
    "Croatia": "slavic", "Serbia": "slavic", "Poland": "slavic", "Czechia": "slavic",
    "Turkey": "turkish",
    "Japan": "japanese",
    "South Korea": "korean",
    "Egypt": "arabic", "Tunisia": "arabic",
}


def pick_foreign(league):
    return random.choice(league["foreign"])


# ------------------------------------------------------------
# Clubs
# ------------------------------------------------------------
LEAGUES = [
    {
        "id": 47, "key": "pl", "name": "Premier League", "short": "PL", "country": "England",
        "season": SEASON, "apiId": 47, "founded": 1992,
        "color": "#3D195B", "accent": "#00FF85",
        "description": "England's top flight, built on high pressing, packed stadiums and the "
                       "fastest tempo in Europe. Six clubs from the north-west and London lead "
                       "the chase this season.",
        "domestic": "England",
        "foreign": ["France", "Brazil", "Portugal", "Spain", "Netherlands", "Argentina",
                    "Nigeria", "Ghana", "Japan", "Denmark", "Belgium", "Croatia"],
        "referees": ["M. Oliver", "A. Taylor", "C. Pawson", "S. Hooper", "P. Tierney"],
        "slots": ["12:30", "15:00", "17:30", "20:00"],
        "teams": [
            ("arsenal", "Arsenal", "ARS", "London", "Emirates Stadium", 60704, 1886,
             "#EF0107", "#FFFFFF", "The Gunners"),
            ("chelsea", "Chelsea", "CHE", "London", "Stamford Bridge", 40343, 1905,
             "#034694", "#FFFFFF", "The Blues"),
            ("liverpool", "Liverpool", "LIV", "Liverpool", "Anfield", 61276, 1892,
             "#C8102E", "#00B2A9", "The Reds"),
            ("manchester-city", "Manchester City", "MCI", "Manchester", "Etihad Stadium", 53400,
             1880, "#6CABDD", "#1C2C5B", "The Citizens"),
            ("tottenham", "Tottenham Hotspur", "TOT", "London", "Tottenham Hotspur Stadium",
             62850, 1882, "#132257", "#FFFFFF", "Spurs"),
            ("newcastle", "Newcastle United", "NEW", "Newcastle", "St James' Park", 52305, 1892,
             "#241F20", "#FFFFFF", "The Magpies"),
            ("aston-villa", "Aston Villa", "AVL", "Birmingham", "Villa Park", 42657, 1874,
             "#95BFE5", "#670E36", "The Villans"),
            ("everton", "Everton", "EVE", "Liverpool", "Hill Dickinson Stadium", 52888, 1878,
             "#003399", "#FFFFFF", "The Toffees"),
        ],
        "marquee": [
            ("arsenal", "chelsea"), ("liverpool", "manchester-city"),
            ("tottenham", "newcastle"), ("aston-villa", "everton"),
        ],
        "live": [(2, 1, 63), (1, 0, 28), (1, 1, 55), (3, 2, 71), (0, 0, 37)],
    },
    {
        "id": 87, "key": "laliga", "name": "LaLiga", "short": "LL", "country": "Spain",
        "season": SEASON, "apiId": 87, "founded": 1929,
        "color": "#EE8707", "accent": "#FF3B30",
        "description": "Spain's top division, where technical midfield play and fierce local "
                       "derbies meet. The title race has tightened after a lively autumn.",
        "domestic": "Spain",
        "foreign": ["Argentina", "Brazil", "Uruguay", "France", "Portugal", "Morocco",
                    "Colombia", "Mexico", "Netherlands", "Italy", "Germany"],
        "referees": ["J. Munuera", "C. Soto Grado", "A. Hernández", "M. Melero", "R. De Burgos"],
        "slots": ["13:00", "16:15", "18:30", "20:00"],
        "teams": [
            ("real-madrid", "Real Madrid", "RMA", "Madrid", "Santiago Bernabéu", 78297, 1902,
             "#FFFFFF", "#FEBE10", "Los Blancos"),
            ("barcelona", "Barcelona", "BAR", "Barcelona", "Spotify Camp Nou", 99354, 1899,
             "#A50044", "#004D98", "Barça"),
            ("atletico-madrid", "Atlético Madrid", "ATM", "Madrid", "Riyadh Air Metropolitano",
             70460, 1903, "#CB3524", "#1E2B5E", "Los Rojiblancos"),
            ("sevilla", "Sevilla", "SEV", "Seville", "Ramón Sánchez-Pizjuán", 43883, 1890,
             "#D6001C", "#FFFFFF", "Los Nervionenses"),
            ("valencia", "Valencia", "VAL", "Valencia", "Mestalla", 49430, 1919,
             "#F5A500", "#000000", "Los Che"),
            ("villarreal", "Villarreal", "VIL", "Villarreal", "Estadio de la Cerámica", 23500,
             1923, "#FFE500", "#005187", "The Yellow Submarine"),
            ("real-sociedad", "Real Sociedad", "RSO", "San Sebastián", "Reale Arena", 39500,
             1909, "#0067B1", "#FFFFFF", "La Real"),
            ("girona", "Girona", "GIR", "Girona", "Estadi Montilivi", 14624, 1930,
             "#CD2534", "#FFFFFF", "The Blanquivermells"),
        ],
        "marquee": [
            ("real-madrid", "sevilla"), ("barcelona", "atletico-madrid"),
            ("valencia", "villarreal"), ("real-sociedad", "girona"),
        ],
        "live": [(1, 0, 42), (2, 2, 68), (0, 1, 33), (1, 1, 57), (2, 0, 24)],
    },
    {
        "id": 135, "key": "seriea", "name": "Serie A", "short": "SA", "country": "Italy",
        "season": SEASON, "apiId": 135, "founded": 1898,
        "color": "#0057B8", "accent": "#00A3E0",
        "description": "Italy's top flight, a chess match of shape and patience. Defensive "
                       "organisation still decides the biggest nights, but the goals are flowing.",
        "domestic": "Italy",
        "foreign": ["Argentina", "Brazil", "France", "Netherlands", "Croatia", "Serbia",
                    "Denmark", "Nigeria", "Poland", "Uruguay"],
        "referees": ["D. Orsato", "M. Guida", "S. Sozza", "F. Maresca", "L. Pairetto"],
        "slots": ["11:30", "14:00", "17:00", "19:45"],
        "teams": [
            ("inter", "Inter", "INT", "Milan", "San Siro", 75923, 1908, "#0068A8", "#000000",
             "Nerazzurri"),
            ("ac-milan", "AC Milan", "MIL", "Milan", "San Siro", 75923, 1899, "#FB090B",
             "#000000", "Rossoneri"),
            ("juventus", "Juventus", "JUV", "Turin", "Allianz Stadium", 41507, 1897,
             "#000000", "#FFFFFF", "Bianconeri"),
            ("napoli", "Napoli", "NAP", "Naples", "Stadio Diego Armando Maradona", 54726, 1926,
             "#12A0D7", "#FFFFFF", "Partenopei"),
            ("roma", "Roma", "ROM", "Rome", "Stadio Olimpico", 70634, 1927, "#8E1F2F",
             "#F0BC42", "Giallorossi"),
            ("lazio", "Lazio", "LAZ", "Rome", "Stadio Olimpico", 70634, 1900, "#87D8F7",
             "#0B2A4A", "Biancocelesti"),
            ("atalanta", "Atalanta", "ATA", "Bergamo", "Gewiss Stadium", 21747, 1907,
             "#1E71B8", "#000000", "La Dea"),
            ("fiorentina", "Fiorentina", "FIO", "Florence", "Stadio Artemio Franchi", 43147,
             1926, "#5C2A84", "#FFFFFF", "La Viola"),
        ],
        "marquee": [
            ("inter", "ac-milan"), ("juventus", "napoli"),
            ("roma", "lazio"), ("atalanta", "fiorentina"),
        ],
        "live": [(2, 2, 74), (1, 0, 39), (0, 0, 21), (1, 2, 66), (3, 1, 58)],
    },
    {
        "id": 78, "key": "bundesliga", "name": "Bundesliga", "short": "BL", "country": "Germany",
        "season": SEASON, "apiId": 78, "founded": 1963,
        "color": "#D20515", "accent": "#FFFFFF",
        "description": "Germany's top flight, the home of gegenpressing, standing terraces and "
                       "the highest goals-per-game average in Europe's big five leagues.",
        "domestic": "Germany",
        "foreign": ["Austria", "Switzerland", "France", "Netherlands", "Denmark", "Japan",
                    "South Korea", "Croatia", "United States", "Brazil", "Nigeria"],
        "referees": ["F. Zwayer", "D. Siebert", "T. Stieler", "S. Jablonski", "H. Osmers"],
        "slots": ["13:30", "15:30", "17:30", "19:30"],
        "teams": [
            ("bayern-munich", "Bayern Munich", "FCB", "Munich", "Allianz Arena", 75024, 1900,
             "#DC052D", "#0066B2", "Die Roten"),
            ("borussia-dortmund", "Borussia Dortmund", "BVB", "Dortmund", "Signal Iduna Park",
             81365, 1909, "#FDE100", "#000000", "Die Schwarzgelben"),
            ("bayer-leverkusen", "Bayer Leverkusen", "B04", "Leverkusen", "BayArena", 30210,
             1904, "#E32221", "#000000", "Die Werkself"),
            ("rb-leipzig", "RB Leipzig", "RBL", "Leipzig", "Red Bull Arena", 47069, 2009,
             "#DD0741", "#001F47", "Die Roten Bullen"),
            ("eintracht-frankfurt", "Eintracht Frankfurt", "SGE", "Frankfurt",
             "Deutsche Bank Park", 51500, 1899, "#E1000F", "#000000", "Die Adler"),
            ("vfb-stuttgart", "VfB Stuttgart", "VFB", "Stuttgart", "MHPArena", 60449, 1893,
             "#E32219", "#FFFFFF", "Die Schwaben"),
            ("borussia-monchengladbach", "Borussia Mönchengladbach", "BMG", "Mönchengladbach",
             "Borussia-Park", 54042, 1900, "#000000", "#009A44", "Die Fohlen"),
            ("werder-bremen", "Werder Bremen", "SVW", "Bremen", "Weserstadion", 42100, 1899,
             "#1D9053", "#FFFFFF", "Die Grün-Weißen"),
        ],
        "marquee": [
            ("bayern-munich", "borussia-dortmund"), ("bayer-leverkusen", "rb-leipzig"),
            ("eintracht-frankfurt", "vfb-stuttgart"),
            ("borussia-monchengladbach", "werder-bremen"),
        ],
        "live": [(3, 2, 71), (1, 1, 46), (0, 0, 30), (2, 1, 62), (1, 3, 80)],
    },
    {
        "id": 61, "key": "ligue1", "name": "Ligue 1", "short": "L1", "country": "France",
        "season": SEASON, "apiId": 61, "founded": 1932,
        "color": "#091C3E", "accent": "#DAE025",
        "description": "France's top division, a showcase for explosive young attackers and "
                       "deep squads. Paris still set the standard, but the chasing pack is close.",
        "domestic": "France",
        "foreign": ["Brazil", "Portugal", "Argentina", "Ivory Coast", "Senegal", "Morocco",
                    "Algeria", "Belgium", "Netherlands", "Spain", "Nigeria"],
        "referees": ["F. Letexier", "C. Turpin", "B. Bastien", "J. Brisard", "S. Frappart"],
        "slots": ["12:00", "15:00", "17:00", "19:45"],
        "teams": [
            ("paris-saint-germain", "Paris Saint-Germain", "PSG", "Paris", "Parc des Princes",
             47929, 1970, "#004170", "#DA291C", "Les Parisiens"),
            ("marseille", "Marseille", "OM", "Marseille", "Orange Vélodrome", 67394, 1899,
             "#2FAEE0", "#FFFFFF", "Les Phocéens"),
            ("lyon", "Lyon", "OL", "Lyon", "Groupama Stadium", 59186, 1950, "#1B3A6B",
             "#E1251B", "Les Gones"),
            ("monaco", "Monaco", "ASM", "Monaco", "Stade Louis II", 18523, 1924, "#E51B22",
             "#FFFFFF", "Les Monégasques"),
            ("lille", "Lille", "LOSC", "Lille", "Stade Pierre-Mauroy", 50186, 1944, "#E01E13",
             "#0B1B3F", "Les Dogues"),
            ("nice", "Nice", "OGCN", "Nice", "Allianz Riviera", 35624, 1904, "#C8102E",
             "#000000", "Les Aiglons"),
            ("rennes", "Rennes", "SRFC", "Rennes", "Roazhon Park", 29778, 1901, "#E13327",
             "#000000", "Les Rouge et Noir"),
            ("lens", "Lens", "RCL", "Lens", "Stade Bollaert-Delelis", 38223, 1906, "#FFE500",
             "#D71920", "Les Sang et Or"),
        ],
        "marquee": [
            ("paris-saint-germain", "marseille"), ("lyon", "monaco"),
            ("lille", "nice"), ("rennes", "lens"),
        ],
        "live": [(0, 0, 37), (2, 1, 52), (1, 1, 44), (2, 0, 29), (1, 2, 69)],
    },
]

TRAITS = {
    "GK": ["Commanding box", "Shot-stopper", "Composed with feet", "Quick off the line"],
    "DEF": ["Aerial threat", "Front-foot defender", "Ball-playing", "Recovery pace"],
    "MID": ["Press-resistant", "Passing range", "Box-to-box", "Set-piece delivery"],
    "FWD": ["Clinical finisher", "Runs in behind", "Aerial presence", "Two-footed"],
}

SLOTS = [
    ("GK", 1, 1, "XI"), ("GK", 2, 13, "BACKUP"),
    ("DEF", 1, 2, "XI"), ("DEF", 2, 3, "XI"), ("DEF", 3, 4, "XI"), ("DEF", 4, 5, "XI"),
    ("DEF", 5, 15, "SUB"),
    ("MID", 1, 6, "XI"), ("MID", 2, 8, "XI"), ("MID", 3, 10, "XI"), ("MID", 4, 14, "SUB"),
    ("FWD", 1, 7, "XI"), ("FWD", 2, 9, "XI"), ("FWD", 3, 11, "XI"),
]

POSITION_NAME = {"GK": "Goalkeeper", "DEF": "Defender", "MID": "Midfielder", "FWD": "Forward"}

AGE_RANGE = {"GK": (24, 36), "DEF": (20, 34), "MID": (19, 33), "FWD": (19, 32)}
HEIGHT_RANGE = {"GK": (186, 198), "DEF": (178, 195), "MID": (168, 188), "FWD": (170, 192)}


def js(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def make_players(team, league):
    rng = random.Random(f"players:{team['id']}")
    domestic_flags = [True] * 9 + [False] * 5
    rng.shuffle(domestic_flags)
    used_names = set()
    players = []

    for (role, depth, number, squad_role), is_domestic in zip(SLOTS, domestic_flags):
        nationality = league["domestic"] if is_domestic else pick_foreign(league)
        pool = POOLS[COUNTRY_POOL[nationality]]
        name = None
        for _ in range(200):
            candidate = f"{rng.choice(pool['first'])} {rng.choice(pool['last'])}"
            if candidate not in used_names and candidate not in GLOBAL_NAMES:
                name = candidate
                break
        if name is None:  # extremely unlikely fallback
            name = f"{rng.choice(pool['first'])} {rng.choice(pool['last'])}-{depth}"
        used_names.add(name)
        GLOBAL_NAMES.add(name)

        age = rng.randint(*AGE_RANGE[role])
        height = rng.randint(*HEIGHT_RANGE[role])
        foot = "Left" if rng.random() < 0.24 else "Right"
        traits = rng.sample(TRAITS[role], 2)
        joined = rng.randint(2019, 2026)

        players.append({
            "id": f"{team['id']}-p{number}",
            "name": name,
            "teamId": team["id"],
            "leagueId": league["id"],
            "position": POSITION_NAME[role],
            "positionCode": role,
            "depth": depth,
            "squadRole": squad_role,
            "number": number,
            "nationality": nationality,
            "age": age,
            "height": height,
            "foot": foot,
            "joined": joined,
            "traits": traits,
        })
    return players


GLOBAL_NAMES = set()


def circle_rounds(n):
    """Standard 1-factorisation of a complete graph with n teams (n even)."""
    order = list(range(n))
    rounds = []
    for _ in range(n - 1):
        rounds.append([(order[i], order[n - 1 - i]) for i in range(n // 2)])
        order = [order[0], order[-1]] + order[1:-1]
    return rounds


def league_schedule(league):
    team_ids = [t[0] for t in league["teams"]]
    base = circle_rounds(8)
    # Put the marquee fixtures in round 6; the second half of the
    # season mirrors it, so round 13 has exactly those fixtures.
    order = list(range(8))
    for (i, j), (home, away) in zip(base[5], league["marquee"]):
        order[i] = away
        order[j] = home
    mapped = [[(order[i], order[j]) for i, j in rnd] for rnd in base]
    rounds = []
    for rnd in mapped:
        rounds.append([(home, away) for home, away in rnd])
    for rnd in mapped:
        rounds.append([(away, home) for home, away in rnd])
    return rounds


def parse_slot(day, slot):
    hour, minute = [int(x) for x in slot.split(":")]
    return day.replace(hour=hour, minute=minute, second=0, microsecond=0)


def weighted_choice(rng, options):
    values, weights = zip(*options)
    return rng.choices(values, weights=weights, k=1)[0]


def pick_scorer(rng, starters):
    options = []
    for p in starters:
        weight = {"GK": 0.02, "DEF": 1.0, "MID": 2.6, "FWD": 4.2}[p["positionCode"]]
        options.append((p, weight))
    return weighted_choice(rng, options)


def pick_assister(rng, starters, scorer):
    options = []
    for p in starters:
        if p["id"] == scorer["id"]:
            continue
        weight = {"GK": 0.05, "DEF": 1.2, "MID": 3.6, "FWD": 2.4}[p["positionCode"]]
        options.append((p, weight))
    if not options:
        return None
    return weighted_choice(rng, options)


def build_events(rng, home_starters, away_starters, home_goals, away_goals, limit_minute):
    events = []
    for side, starters, goals in (("home", home_starters, home_goals),
                                  ("away", away_starters, away_goals)):
        minutes = sorted(rng.sample(range(2, min(limit_minute, 90) + 1), goals)) if goals else []
        for minute in minutes:
            scorer = pick_scorer(rng, starters)
            assist = pick_assister(rng, starters, scorer) if rng.random() < 0.72 else None
            event = {"minute": minute, "type": "goal", "side": side,
                     "playerId": scorer["id"]}
            if assist:
                event["assistId"] = assist["id"]
            events.append(event)

    # Yellow cards
    for side, starters in (("home", home_starters), ("away", away_starters)):
        count = weighted_choice(rng, [(0, 18), (1, 30), (2, 27), (3, 16), (4, 9)])
        minutes = sorted(rng.sample(range(12, min(limit_minute, 90) + 1), count)) if count else []
        for minute in minutes:
            player = rng.choice(starters)
            events.append({"minute": minute, "type": "yellow", "side": side,
                           "playerId": player["id"]})

    # Occasional red card
    if rng.random() < 0.035:
        side = rng.choice(["home", "away"])
        starters = home_starters if side == "home" else away_starters
        events.append({"minute": rng.randint(35, min(limit_minute, 90)), "type": "red",
                       "side": side, "playerId": rng.choice(starters)["id"]})

    events.sort(key=lambda e: (e["minute"], e["type"] != "goal"))

    # A second yellow becomes a red, so no player collects two yellows.
    seen_yellow = {}
    fixed = []
    for event in events:
        if event["type"] == "yellow":
            key = (event["side"], event["playerId"])
            if key in seen_yellow:
                continue  # drop the duplicate booking
            seen_yellow[key] = event["minute"]
        fixed.append(event)
    return fixed


def score_from_events(events):
    home = sum(1 for e in events if e["type"] == "goal" and e["side"] == "home")
    away = sum(1 for e in events if e["type"] == "goal" and e["side"] == "away")
    return {"home": home, "away": away}


def main():
    teams_out = []
    players_out = []

    for league in LEAGUES:
        for t in league["teams"]:
            team_id, name, short, city, stadium, capacity, founded, color, color2, nickname = t
            teams_out.append({
                "id": team_id,
                "name": name,
                "short": short,
                "leagueId": league["id"],
                "city": city,
                "stadium": stadium,
                "capacity": capacity,
                "founded": founded,
                "colors": [color, color2],
                "nickname": nickname,
                "country": league["country"],
            })

    team_by_id = {t["id"]: t for t in teams_out}
    players_by_team = {}
    for league in LEAGUES:
        for t in league["teams"]:
            team = team_by_id[t[0]]
            squad = make_players(team, league)
            players_by_team[team["id"]] = squad
            players_out.extend(squad)

    matches_out = []
    # round 1 = 5 Sep 2026, weekly to round 12 = 21 Nov 2026
    finished_days = [datetime(2026, 9, 5, tzinfo=timezone.utc) + timedelta(weeks=r)
                     for r in range(12)]

    for league in LEAGUES:
        schedule = league_schedule(league)

        for round_index, pairs in enumerate(schedule, start=1):
            if round_index <= 12:
                day = finished_days[round_index - 1]
                status = "finished"
            elif round_index == 13:
                day = datetime(2026, 11, 26, tzinfo=timezone.utc)
                status = "today"
            else:
                day = datetime(2026, 11, 29, tzinfo=timezone.utc)
                status = "upcoming"

            for match_index, (home_id, away_id) in enumerate(pairs):
                home = team_by_id[home_id]
                away = team_by_id[away_id]
                home_squad = players_by_team[home_id]
                away_squad = players_by_team[away_id]
                home_starters = [p for p in home_squad if p["squadRole"] == "XI"]
                away_starters = [p for p in away_squad if p["squadRole"] == "XI"]

                match_id = f"{league['key']}-r{round_index}-{match_index + 1}"
                rng = random.Random(f"match:{match_id}")
                minute = None
                events = []
                score = None

                if status == "finished":
                    kickoff = parse_slot(day, league["slots"][match_index])
                    home_goals = weighted_choice(rng, [(0, 16), (1, 27), (2, 27), (3, 17),
                                                      (4, 9), (5, 4)])
                    away_goals = weighted_choice(rng, [(0, 24), (1, 31), (2, 25), (3, 13),
                                                      (4, 7)])
                    events = build_events(rng, home_starters, away_starters,
                                          home_goals, away_goals, 90)
                    score = score_from_events(events)
                    live = False
                elif status == "today":
                    if match_index == 0:
                        hg, ag, minute = LIVE[league["key"]]
                        kickoff = (NOW - timedelta(minutes=minute + 15)).replace(second=0,
                                                                                microsecond=0)
                        events = build_events(rng, home_starters, away_starters, hg, ag, minute)
                        score = score_from_events(events)
                        live = True
                    else:
                        kickoff = parse_slot(day, ["15:00", "17:30", "20:00"][match_index - 1])
                        events = []
                        score = None
                        live = False
                else:
                    kickoff = parse_slot(day, ["13:00", "15:00", "17:30", "20:00"][match_index])
                    events = []
                    score = None
                    live = False

                match = {
                    "id": match_id,
                    "leagueId": league["id"],
                    "round": round_index,
                    "status": "live" if status == "today" and match_index == 0
                    else ("finished" if status == "finished" else "upcoming"),
                    "kickoff": kickoff.isoformat().replace("+00:00", "Z"),
                    "minute": minute,
                    "venue": home["stadium"],
                    "city": home["city"],
                    "referee": rng.choice(league["referees"]),
                    "home": {"id": home["id"], "name": home["name"], "short": home["short"]},
                    "away": {"id": away["id"], "name": away["name"], "short": away["short"]},
                    "score": score,
                    "events": events,
                }
                if match["status"] != "upcoming":
                    match["attendance"] = int(home["capacity"] * rng.uniform(0.83, 1.0))
                else:
                    match["attendance"] = None
                matches_out.append(match)

    leagues_out = []
    for league in LEAGUES:
        leagues_out.append({
            "id": league["id"],
            "name": league["name"],
            "short": league["short"],
            "country": league["country"],
            "season": league["season"],
            "apiId": league["apiId"],
            "founded": league["founded"],
            "color": league["color"],
            "accent": league["accent"],
            "description": league["description"],
        })

    updated = NOW.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    matches_out.sort(key=lambda m: (m["kickoff"], m["id"]))

    # ---------- write files ----------
    teams_header = """/* ============================================================
   teams-data.js - the 40 clubs used by the website.
   Auto-generated by tools/generate_data.py (sample demo data).
   ============================================================ */
window.MATCHDAY_TEAMS = [
"""
    teams_body = "".join(f"  {js(t)},\n" for t in teams_out)
    (DATA / "teams-data.js").write_text(teams_header + teams_body + "];\n", encoding="utf-8")

    players_header = """/* ============================================================
   players-data.js - squads for every club (14 players per club).
   Auto-generated by tools/generate_data.py (sample demo data).
   Season totals are calculated in assets/js/store.js from match
   events and line-ups, so every page shows the same numbers.
   ============================================================ */
window.MATCHDAY_PLAYERS = [
"""
    players_body = "".join(f"  {js(p)},\n" for p in players_out)
    (DATA / "players-data.js").write_text(players_header + players_body + "];\n",
                                          encoding="utf-8")

    matches_header = f"""/* ============================================================
   matches-data.js - leagues and the full 14-round fixture list.
   Auto-generated by tools/generate_data.py.

   This is SAMPLE data: clubs and stadiums are real, but every
   score, goal event and kickoff result is simulated for the
   IICT project demo. Replace this file with live API data in the
   same shape to go live (set isSample to false).

   status : "live" | "upcoming" | "finished"
   events : {{ minute, type: "goal"|"yellow"|"red", side, playerId, assistId? }}
   ============================================================ */
window.MATCHDAY_DATA = {{
  isSample: true,
  updatedAt: "{updated}",
  season: "{SEASON}",
  leagues: [
"""
    leagues_body = "".join(f"    {js(l)},\n" for l in leagues_out)
    matches_part = """  ],
  matches: [
"""
    matches_body = "".join(f"    {js(m)},\n" for m in matches_out)
    (DATA / "matches-data.js").write_text(
        matches_header + leagues_body + matches_part + matches_body + "  ],\n};\n",
        encoding="utf-8")

    print(f"leagues : {len(leagues_out)}")
    print(f"teams   : {len(teams_out)}")
    print(f"players : {len(players_out)}")
    print(f"matches : {len(matches_out)}")
    counts = {}
    for m in matches_out:
        counts[m["status"]] = counts.get(m["status"], 0) + 1
    print("status  :", counts)
    for name in ("matches-data.js", "teams-data.js", "players-data.js"):
        print(name, (DATA / name).stat().st_size, "bytes")


LIVE = {
    "pl": (2, 1, 63),
    "laliga": (1, 0, 42),
    "seriea": (2, 2, 74),
    "bundesliga": (3, 2, 71),
    "ligue1": (0, 0, 37),
}

if __name__ == "__main__":
    main()
