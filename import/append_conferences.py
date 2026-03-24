import json

sec = {
    "conference": "SEC",
    "teams": [
        {
            "name": "Alabama",
            "nickname": "Crimson Tide",
            "primaryColor": "#9E1B32",
            "record": "",
            "logo": "",
            "head_coach": "Nate Oats",
            "city": "Tuscaloosa",
            "possessions_per_game": 73.5,
            "offensive_rebound_pct": 0.28,
            "defensive_rebound_pct": 0.72,
            "assist_rate": 0.54,
            "team_fouls_per_game": 17,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"2","name":"Labaron Philon","position":"G","height":74,"weight":185,"class":"SO","minutes_per_game":31.0,"ppg":16.8,"rpg":3.1,"apg":4.2,"bpg":0.2,"spg":1.2,"fga_per_100":20.5,"three_pa_per_100":8.2,"three_point_pct":0.368,"two_point_pct":0.498,"free_throw_pct":0.821,"offensive_rebounds_per_100":1.1,"defensive_rebounds_per_100":5.0,"assists_per_100":8.1,"steals_per_100":2.1,"blocks_per_100":0.4,"turnovers_per_100":3.2,"personal_fouls_per_100":2.4},
                {"number":"5","name":"Aden Holloway","position":"G","height":73,"weight":175,"class":"SO","minutes_per_game":28.5,"ppg":14.2,"rpg":2.8,"apg":3.5,"bpg":0.1,"spg":1.0,"fga_per_100":18.8,"three_pa_per_100":9.1,"three_point_pct":0.374,"two_point_pct":0.481,"free_throw_pct":0.808,"offensive_rebounds_per_100":0.9,"defensive_rebounds_per_100":4.4,"assists_per_100":6.9,"steals_per_100":1.8,"blocks_per_100":0.2,"turnovers_per_100":2.9,"personal_fouls_per_100":2.2},
                {"number":"12","name":"Mouhamed Dioubate","position":"F","height":81,"weight":215,"class":"FR","minutes_per_game":26.0,"ppg":11.5,"rpg":7.2,"apg":1.2,"bpg":1.8,"spg":0.6,"fga_per_100":15.2,"three_pa_per_100":1.8,"three_point_pct":0.312,"two_point_pct":0.548,"free_throw_pct":0.701,"offensive_rebounds_per_100":4.2,"defensive_rebounds_per_100":8.5,"assists_per_100":2.1,"steals_per_100":1.0,"blocks_per_100":3.2,"turnovers_per_100":2.4,"personal_fouls_per_100":3.8},
                {"number":"22","name":"Grant Nelson","position":"F","height":82,"weight":220,"class":"SR","minutes_per_game":29.0,"ppg":13.8,"rpg":7.5,"apg":2.0,"bpg":1.5,"spg":0.8,"fga_per_100":16.5,"three_pa_per_100":4.2,"three_point_pct":0.352,"two_point_pct":0.531,"free_throw_pct":0.742,"offensive_rebounds_per_100":3.5,"defensive_rebounds_per_100":9.2,"assists_per_100":3.5,"steals_per_100":1.4,"blocks_per_100":2.6,"turnovers_per_100":2.8,"personal_fouls_per_100":3.2},
                {"number":"3","name":"Rylan Griffen","position":"G","height":77,"weight":195,"class":"JR","minutes_per_game":27.0,"ppg":12.1,"rpg":3.5,"apg":1.8,"bpg":0.3,"spg":0.9,"fga_per_100":17.2,"three_pa_per_100":10.5,"three_point_pct":0.388,"two_point_pct":0.462,"free_throw_pct":0.835,"offensive_rebounds_per_100":1.2,"defensive_rebounds_per_100":4.8,"assists_per_100":3.2,"steals_per_100":1.5,"blocks_per_100":0.5,"turnovers_per_100":2.2,"personal_fouls_per_100":2.0},
                {"number":"11","name":"Mark Sears","position":"G","height":73,"weight":185,"class":"SR","minutes_per_game":32.0,"ppg":20.2,"rpg":3.0,"apg":4.0,"bpg":0.2,"spg":1.1,"fga_per_100":22.1,"three_pa_per_100":10.0,"three_point_pct":0.381,"two_point_pct":0.505,"free_throw_pct":0.872,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":4.2,"assists_per_100":7.5,"steals_per_100":1.9,"blocks_per_100":0.4,"turnovers_per_100":3.0,"personal_fouls_per_100":2.1},
                {"number":"33","name":"Jarin Stevenson","position":"F","height":80,"weight":210,"class":"SO","minutes_per_game":18.0,"ppg":7.2,"rpg":4.8,"apg":0.8,"bpg":0.9,"spg":0.4,"fga_per_100":12.5,"three_pa_per_100":2.1,"three_point_pct":0.321,"two_point_pct":0.512,"free_throw_pct":0.688,"offensive_rebounds_per_100":3.1,"defensive_rebounds_per_100":7.2,"assists_per_100":1.5,"steals_per_100":0.8,"blocks_per_100":1.8,"turnovers_per_100":2.1,"personal_fouls_per_100":3.5},
                {"number":"14","name":"Chris Youngblood","position":"G","height":76,"weight":190,"class":"SR","minutes_per_game":22.0,"ppg":9.5,"rpg":2.5,"apg":1.5,"bpg":0.1,"spg":0.7,"fga_per_100":14.8,"three_pa_per_100":9.2,"three_point_pct":0.395,"two_point_pct":0.445,"free_throw_pct":0.825,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.5,"assists_per_100":2.8,"steals_per_100":1.2,"blocks_per_100":0.2,"turnovers_per_100":1.8,"personal_fouls_per_100":2.0},
                {"number":"4","name":"Clifford Omoruyi","position":"C","height":83,"weight":245,"class":"SR","minutes_per_game":20.0,"ppg":8.8,"rpg":6.5,"apg":0.8,"bpg":1.4,"spg":0.4,"fga_per_100":14.2,"three_pa_per_100":0.5,"three_point_pct":0.280,"two_point_pct":0.571,"free_throw_pct":0.672,"offensive_rebounds_per_100":4.5,"defensive_rebounds_per_100":9.8,"assists_per_100":1.5,"steals_per_100":0.8,"blocks_per_100":2.8,"turnovers_per_100":2.0,"personal_fouls_per_100":4.2},
                {"number":"21","name":"Derrion Reid","position":"G","height":75,"weight":180,"class":"FR","minutes_per_game":14.0,"ppg":5.5,"rpg":1.8,"apg":1.2,"bpg":0.1,"spg":0.5,"fga_per_100":11.5,"three_pa_per_100":6.5,"three_point_pct":0.335,"two_point_pct":0.441,"free_throw_pct":0.775,"offensive_rebounds_per_100":0.6,"defensive_rebounds_per_100":2.8,"assists_per_100":2.2,"steals_per_100":0.9,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.2}
            ]
        },
        {
            "name": "Arkansas",
            "nickname": "Razorbacks",
            "primaryColor": "#9D2235",
            "record": "",
            "logo": "",
            "head_coach": "John Calipari",
            "city": "Fayetteville",
            "possessions_per_game": 72.0,
            "offensive_rebound_pct": 0.30,
            "defensive_rebound_pct": 0.70,
            "assist_rate": 0.52,
            "team_fouls_per_game": 18,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"3","name":"Adou Thiero","position":"G","height":78,"weight":200,"class":"SO","minutes_per_game":31.0,"ppg":17.5,"rpg":6.2,"apg":2.5,"bpg":0.8,"spg":1.5,"fga_per_100":20.2,"three_pa_per_100":6.5,"three_point_pct":0.348,"two_point_pct":0.518,"free_throw_pct":0.762,"offensive_rebounds_per_100":2.8,"defensive_rebounds_per_100":8.5,"assists_per_100":4.2,"steals_per_100":2.5,"blocks_per_100":1.4,"turnovers_per_100":3.1,"personal_fouls_per_100":2.8},
                {"number":"1","name":"Johnell Davis","position":"G","height":76,"weight":185,"class":"SR","minutes_per_game":30.0,"ppg":16.2,"rpg":4.5,"apg":3.8,"bpg":0.3,"spg":1.2,"fga_per_100":20.8,"three_pa_per_100":9.5,"three_point_pct":0.362,"two_point_pct":0.488,"free_throw_pct":0.798,"offensive_rebounds_per_100":1.8,"defensive_rebounds_per_100":6.2,"assists_per_100":6.8,"steals_per_100":2.1,"blocks_per_100":0.5,"turnovers_per_100":3.5,"personal_fouls_per_100":2.5},
                {"number":"11","name":"Boogie Fland","position":"G","height":74,"weight":178,"class":"SO","minutes_per_game":28.0,"ppg":14.8,"rpg":2.8,"apg":4.5,"bpg":0.1,"spg":1.1,"fga_per_100":19.5,"three_pa_per_100":10.2,"three_point_pct":0.371,"two_point_pct":0.471,"free_throw_pct":0.842,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":4.0,"assists_per_100":8.5,"steals_per_100":1.9,"blocks_per_100":0.2,"turnovers_per_100":3.8,"personal_fouls_per_100":2.2},
                {"number":"5","name":"Zvonimir Ivisic","position":"C","height":86,"weight":240,"class":"SO","minutes_per_game":26.0,"ppg":12.5,"rpg":8.2,"apg":1.0,"bpg":2.2,"spg":0.5,"fga_per_100":16.2,"three_pa_per_100":1.2,"three_point_pct":0.298,"two_point_pct":0.568,"free_throw_pct":0.695,"offensive_rebounds_per_100":4.8,"defensive_rebounds_per_100":10.5,"assists_per_100":1.8,"steals_per_100":0.9,"blocks_per_100":4.2,"turnovers_per_100":2.2,"personal_fouls_per_100":4.0},
                {"number":"2","name":"DJ Wagner","position":"G","height":76,"weight":185,"class":"SO","minutes_per_game":25.0,"ppg":11.8,"rpg":2.5,"apg":3.8,"bpg":0.1,"spg":0.9,"fga_per_100":17.5,"three_pa_per_100":8.8,"three_point_pct":0.358,"two_point_pct":0.462,"free_throw_pct":0.818,"offensive_rebounds_per_100":0.7,"defensive_rebounds_per_100":3.5,"assists_per_100":7.2,"steals_per_100":1.6,"blocks_per_100":0.2,"turnovers_per_100":3.2,"personal_fouls_per_100":2.1},
                {"number":"23","name":"Trevon Brazile","position":"F","height":82,"weight":215,"class":"JR","minutes_per_game":24.0,"ppg":10.5,"rpg":7.0,"apg":1.5,"bpg":1.8,"spg":0.8,"fga_per_100":15.5,"three_pa_per_100":3.5,"three_point_pct":0.335,"two_point_pct":0.528,"free_throw_pct":0.712,"offensive_rebounds_per_100":3.5,"defensive_rebounds_per_100":9.2,"assists_per_100":2.8,"steals_per_100":1.4,"blocks_per_100":3.5,"turnovers_per_100":2.5,"personal_fouls_per_100":3.5},
                {"number":"34","name":"Billy Richmond III","position":"F","height":80,"weight":205,"class":"FR","minutes_per_game":20.0,"ppg":8.5,"rpg":4.2,"apg":1.2,"bpg":0.5,"spg":0.6,"fga_per_100":14.2,"three_pa_per_100":5.8,"three_point_pct":0.342,"two_point_pct":0.498,"free_throw_pct":0.745,"offensive_rebounds_per_100":2.1,"defensive_rebounds_per_100":6.0,"assists_per_100":2.2,"steals_per_100":1.0,"blocks_per_100":1.0,"turnovers_per_100":2.2,"personal_fouls_per_100":2.8},
                {"number":"15","name":"Karter Knox","position":"G","height":77,"weight":195,"class":"SO","minutes_per_game":18.0,"ppg":7.2,"rpg":2.8,"apg":1.5,"bpg":0.2,"spg":0.5,"fga_per_100":13.5,"three_pa_per_100":7.2,"three_point_pct":0.355,"two_point_pct":0.448,"free_throw_pct":0.780,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":3.8,"assists_per_100":2.8,"steals_per_100":0.9,"blocks_per_100":0.4,"turnovers_per_100":2.0,"personal_fouls_per_100":2.2},
                {"number":"10","name":"Khamel Djellouli","position":"G","height":78,"weight":190,"class":"FR","minutes_per_game":15.0,"ppg":5.8,"rpg":2.2,"apg":1.8,"bpg":0.1,"spg":0.4,"fga_per_100":12.2,"three_pa_per_100":7.5,"three_point_pct":0.345,"two_point_pct":0.445,"free_throw_pct":0.765,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.2,"assists_per_100":3.2,"steals_per_100":0.7,"blocks_per_100":0.2,"turnovers_per_100":2.8,"personal_fouls_per_100":2.0}
            ]
        },
        {
            "name": "Auburn",
            "nickname": "Tigers",
            "primaryColor": "#0C2340",
            "record": "",
            "logo": "",
            "head_coach": "Bruce Pearl",
            "city": "Auburn",
            "possessions_per_game": 76.0,
            "offensive_rebound_pct": 0.31,
            "defensive_rebound_pct": 0.69,
            "assist_rate": 0.56,
            "team_fouls_per_game": 16,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"1","name":"Johni Broome","position":"C","height":82,"weight":240,"class":"SR","minutes_per_game":31.0,"ppg":19.5,"rpg":11.2,"apg":2.5,"bpg":2.4,"spg":1.0,"fga_per_100":19.8,"three_pa_per_100":2.2,"three_point_pct":0.318,"two_point_pct":0.568,"free_throw_pct":0.742,"offensive_rebounds_per_100":5.2,"defensive_rebounds_per_100":13.5,"assists_per_100":3.8,"steals_per_100":1.5,"blocks_per_100":4.5,"turnovers_per_100":2.8,"personal_fouls_per_100":3.2},
                {"number":"3","name":"Tahaad Pettiford","position":"G","height":73,"weight":168,"class":"SO","minutes_per_game":28.0,"ppg":14.5,"rpg":2.5,"apg":4.8,"bpg":0.1,"spg":1.2,"fga_per_100":19.5,"three_pa_per_100":10.8,"three_point_pct":0.371,"two_point_pct":0.468,"free_throw_pct":0.852,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.5,"assists_per_100":9.2,"steals_per_100":2.2,"blocks_per_100":0.2,"turnovers_per_100":3.8,"personal_fouls_per_100":2.2},
                {"number":"4","name":"Chaney Johnson","position":"F","height":82,"weight":235,"class":"JR","minutes_per_game":25.0,"ppg":11.2,"rpg":7.5,"apg":1.2,"bpg":1.2,"spg":0.6,"fga_per_100":15.5,"three_pa_per_100":2.5,"three_point_pct":0.328,"two_point_pct":0.538,"free_throw_pct":0.705,"offensive_rebounds_per_100":4.2,"defensive_rebounds_per_100":9.8,"assists_per_100":2.2,"steals_per_100":1.0,"blocks_per_100":2.5,"turnovers_per_100":2.2,"personal_fouls_per_100":3.8},
                {"number":"2","name":"Denver Jones","position":"G","height":75,"weight":185,"class":"JR","minutes_per_game":27.0,"ppg":12.8,"rpg":3.2,"apg":3.5,"bpg":0.2,"spg":1.0,"fga_per_100":17.8,"three_pa_per_100":9.2,"three_point_pct":0.358,"two_point_pct":0.478,"free_throw_pct":0.812,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":4.5,"assists_per_100":6.5,"steals_per_100":1.8,"blocks_per_100":0.4,"turnovers_per_100":3.0,"personal_fouls_per_100":2.4},
                {"number":"5","name":"Miles Kelly","position":"G","height":77,"weight":195,"class":"SR","minutes_per_game":26.0,"ppg":13.5,"rpg":3.5,"apg":2.2,"bpg":0.2,"spg":0.8,"fga_per_100":18.5,"three_pa_per_100":11.2,"three_point_pct":0.392,"two_point_pct":0.458,"free_throw_pct":0.835,"offensive_rebounds_per_100":1.2,"defensive_rebounds_per_100":4.8,"assists_per_100":4.0,"steals_per_100":1.4,"blocks_per_100":0.4,"turnovers_per_100":2.5,"personal_fouls_per_100":2.2},
                {"number":"10","name":"Chad Baker-Mazara","position":"F","height":80,"weight":205,"class":"JR","minutes_per_game":24.0,"ppg":10.2,"rpg":5.2,"apg":1.5,"bpg":0.8,"spg":0.7,"fga_per_100":15.2,"three_pa_per_100":5.5,"three_point_pct":0.355,"two_point_pct":0.508,"free_throw_pct":0.742,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.2,"assists_per_100":2.8,"steals_per_100":1.2,"blocks_per_100":1.5,"turnovers_per_100":2.2,"personal_fouls_per_100":3.0},
                {"number":"22","name":"Zep Jasper","position":"G","height":74,"weight":182,"class":"SR","minutes_per_game":20.0,"ppg":8.2,"rpg":2.8,"apg":2.0,"bpg":0.1,"spg":0.7,"fga_per_100":14.5,"three_pa_per_100":8.5,"three_point_pct":0.385,"two_point_pct":0.445,"free_throw_pct":0.808,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.8,"assists_per_100":3.8,"steals_per_100":1.2,"blocks_per_100":0.2,"turnovers_per_100":2.2,"personal_fouls_per_100":2.0},
                {"number":"33","name":"Lior Berman","position":"F","height":81,"weight":215,"class":"SO","minutes_per_game":16.0,"ppg":6.5,"rpg":4.5,"apg":0.8,"bpg":0.8,"spg":0.4,"fga_per_100":12.8,"three_pa_per_100":3.2,"three_point_pct":0.335,"two_point_pct":0.518,"free_throw_pct":0.695,"offensive_rebounds_per_100":2.8,"defensive_rebounds_per_100":6.8,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":1.5,"turnovers_per_100":2.0,"personal_fouls_per_100":3.2},
                {"number":"11","name":"Kam Williams","position":"G","height":76,"weight":190,"class":"FR","minutes_per_game":13.0,"ppg":4.8,"rpg":1.8,"apg":1.2,"bpg":0.1,"spg":0.4,"fga_per_100":11.5,"three_pa_per_100":7.2,"three_point_pct":0.328,"two_point_pct":0.438,"free_throw_pct":0.758,"offensive_rebounds_per_100":0.5,"defensive_rebounds_per_100":2.5,"assists_per_100":2.2,"steals_per_100":0.7,"blocks_per_100":0.2,"turnovers_per_100":2.2,"personal_fouls_per_100":2.0}
            ]
        },
        {
            "name": "Florida",
            "nickname": "Gators",
            "primaryColor": "#0021A5",
            "record": "",
            "logo": "",
            "head_coach": "Todd Golden",
            "city": "Gainesville",
            "possessions_per_game": 74.0,
            "offensive_rebound_pct": 0.29,
            "defensive_rebound_pct": 0.71,
            "assist_rate": 0.55,
            "team_fouls_per_game": 17,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"2","name":"Walter Clayton Jr.","position":"G","height":74,"weight":185,"class":"SR","minutes_per_game":32.0,"ppg":19.8,"rpg":3.2,"apg":4.5,"bpg":0.2,"spg":1.2,"fga_per_100":21.5,"three_pa_per_100":10.5,"three_point_pct":0.388,"two_point_pct":0.502,"free_throw_pct":0.855,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":4.5,"assists_per_100":8.2,"steals_per_100":2.0,"blocks_per_100":0.4,"turnovers_per_100":3.2,"personal_fouls_per_100":2.2},
                {"number":"14","name":"Will Richard","position":"G","height":77,"weight":200,"class":"SR","minutes_per_game":30.0,"ppg":15.5,"rpg":4.8,"apg":2.5,"bpg":0.5,"spg":1.0,"fga_per_100":18.8,"three_pa_per_100":9.5,"three_point_pct":0.375,"two_point_pct":0.488,"free_throw_pct":0.818,"offensive_rebounds_per_100":1.8,"defensive_rebounds_per_100":6.5,"assists_per_100":4.5,"steals_per_100":1.8,"blocks_per_100":1.0,"turnovers_per_100":2.8,"personal_fouls_per_100":2.5},
                {"number":"5","name":"Alex Condon","position":"C","height":84,"weight":230,"class":"JR","minutes_per_game":27.0,"ppg":12.2,"rpg":8.5,"apg":1.8,"bpg":1.8,"spg":0.5,"fga_per_100":16.5,"three_pa_per_100":1.5,"three_point_pct":0.305,"two_point_pct":0.555,"free_throw_pct":0.712,"offensive_rebounds_per_100":4.5,"defensive_rebounds_per_100":10.8,"assists_per_100":3.2,"steals_per_100":0.9,"blocks_per_100":3.5,"turnovers_per_100":2.5,"personal_fouls_per_100":3.8},
                {"number":"1","name":"Alijah Martin","position":"G","height":75,"weight":180,"class":"SR","minutes_per_game":29.0,"ppg":13.8,"rpg":4.2,"apg":3.0,"bpg":0.3,"spg":1.1,"fga_per_100":18.5,"three_pa_per_100":8.8,"three_point_pct":0.362,"two_point_pct":0.478,"free_throw_pct":0.798,"offensive_rebounds_per_100":1.5,"defensive_rebounds_per_100":5.8,"assists_per_100":5.5,"steals_per_100":1.9,"blocks_per_100":0.6,"turnovers_per_100":2.8,"personal_fouls_per_100":2.4},
                {"number":"4","name":"Thomas Haugh","position":"F","height":82,"weight":218,"class":"JR","minutes_per_game":25.0,"ppg":10.5,"rpg":5.8,"apg":1.5,"bpg":0.8,"spg":0.6,"fga_per_100":15.2,"three_pa_per_100":5.2,"three_point_pct":0.352,"two_point_pct":0.518,"free_throw_pct":0.755,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.8,"assists_per_100":2.8,"steals_per_100":1.0,"blocks_per_100":1.5,"turnovers_per_100":2.2,"personal_fouls_per_100":2.8},
                {"number":"21","name":"Rueben Chinyelu","position":"F","height":82,"weight":225,"class":"JR","minutes_per_game":22.0,"ppg":8.8,"rpg":6.8,"apg":0.8,"bpg":1.5,"spg":0.5,"fga_per_100":14.5,"three_pa_per_100":1.2,"three_point_pct":0.295,"two_point_pct":0.548,"free_throw_pct":0.682,"offensive_rebounds_per_100":3.8,"defensive_rebounds_per_100":9.2,"assists_per_100":1.5,"steals_per_100":0.9,"blocks_per_100":3.0,"turnovers_per_100":2.2,"personal_fouls_per_100":3.5},
                {"number":"11","name":"Zyon Pullin","position":"G","height":74,"weight":182,"class":"SR","minutes_per_game":20.0,"ppg":8.5,"rpg":2.5,"apg":2.5,"bpg":0.1,"spg":0.8,"fga_per_100":14.8,"three_pa_per_100":8.5,"three_point_pct":0.378,"two_point_pct":0.452,"free_throw_pct":0.815,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.5,"assists_per_100":4.5,"steals_per_100":1.4,"blocks_per_100":0.2,"turnovers_per_100":2.2,"personal_fouls_per_100":2.0},
                {"number":"3","name":"Denzel Aberdeen","position":"G","height":76,"weight":188,"class":"SO","minutes_per_game":17.0,"ppg":6.8,"rpg":2.2,"apg":1.8,"bpg":0.2,"spg":0.5,"fga_per_100":13.2,"three_pa_per_100":7.8,"three_point_pct":0.355,"two_point_pct":0.445,"free_throw_pct":0.785,"offensive_rebounds_per_100":0.7,"defensive_rebounds_per_100":3.0,"assists_per_100":3.2,"steals_per_100":0.9,"blocks_per_100":0.4,"turnovers_per_100":2.0,"personal_fouls_per_100":2.2},
                {"number":"13","name":"Micah Handlogten","position":"C","height":85,"weight":240,"class":"SR","minutes_per_game":15.0,"ppg":5.2,"rpg":5.5,"apg":0.5,"bpg":1.8,"spg":0.3,"fga_per_100":11.5,"three_pa_per_100":0.5,"three_point_pct":0.285,"two_point_pct":0.558,"free_throw_pct":0.658,"offensive_rebounds_per_100":3.5,"defensive_rebounds_per_100":8.5,"assists_per_100":1.0,"steals_per_100":0.5,"blocks_per_100":3.5,"turnovers_per_100":1.8,"personal_fouls_per_100":4.5}
            ]
        },
        {
            "name": "Georgia",
            "nickname": "Bulldogs",
            "primaryColor": "#BA0C2F",
            "record": "",
            "logo": "",
            "head_coach": "Mike White",
            "city": "Athens",
            "possessions_per_game": 71.0,
            "offensive_rebound_pct": 0.28,
            "defensive_rebound_pct": 0.72,
            "assist_rate": 0.52,
            "team_fouls_per_game": 18,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"4","name":"Dylan James","position":"G","height":77,"weight":195,"class":"SR","minutes_per_game":30.0,"ppg":15.8,"rpg":4.2,"apg":3.2,"bpg":0.3,"spg":1.0,"fga_per_100":20.5,"three_pa_per_100":9.8,"three_point_pct":0.365,"two_point_pct":0.485,"free_throw_pct":0.812,"offensive_rebounds_per_100":1.5,"defensive_rebounds_per_100":6.0,"assists_per_100":5.8,"steals_per_100":1.8,"blocks_per_100":0.5,"turnovers_per_100":3.0,"personal_fouls_per_100":2.5},
                {"number":"2","name":"RJ Melendez","position":"G","height":78,"weight":195,"class":"SO","minutes_per_game":28.0,"ppg":13.5,"rpg":4.8,"apg":2.8,"bpg":0.5,"spg":1.0,"fga_per_100":18.8,"three_pa_per_100":7.5,"three_point_pct":0.355,"two_point_pct":0.498,"free_throw_pct":0.775,"offensive_rebounds_per_100":2.0,"defensive_rebounds_per_100":6.8,"assists_per_100":5.0,"steals_per_100":1.7,"blocks_per_100":1.0,"turnovers_per_100":2.8,"personal_fouls_per_100":2.8},
                {"number":"5","name":"Frank Anselem","position":"C","height":83,"weight":235,"class":"SR","minutes_per_game":25.0,"ppg":10.8,"rpg":8.2,"apg":1.0,"bpg":1.8,"spg":0.5,"fga_per_100":16.2,"three_pa_per_100":1.0,"three_point_pct":0.295,"two_point_pct":0.548,"free_throw_pct":0.692,"offensive_rebounds_per_100":4.5,"defensive_rebounds_per_100":10.8,"assists_per_100":1.8,"steals_per_100":0.9,"blocks_per_100":3.5,"turnovers_per_100":2.2,"personal_fouls_per_100":3.8},
                {"number":"1","name":"Silas Demary Jr.","position":"G","height":74,"weight":178,"class":"JR","minutes_per_game":27.0,"ppg":12.8,"rpg":2.5,"apg":4.2,"bpg":0.1,"spg":1.1,"fga_per_100":18.5,"three_pa_per_100":10.2,"three_point_pct":0.372,"two_point_pct":0.462,"free_throw_pct":0.835,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.5,"assists_per_100":7.8,"steals_per_100":2.0,"blocks_per_100":0.2,"turnovers_per_100":3.5,"personal_fouls_per_100":2.2},
                {"number":"23","name":"Asa Newell","position":"F","height":82,"weight":215,"class":"FR","minutes_per_game":24.0,"ppg":11.2,"rpg":6.8,"apg":1.5,"bpg":1.2,"spg":0.7,"fga_per_100":16.5,"three_pa_per_100":4.5,"three_point_pct":0.338,"two_point_pct":0.522,"free_throw_pct":0.718,"offensive_rebounds_per_100":3.2,"defensive_rebounds_per_100":9.0,"assists_per_100":2.8,"steals_per_100":1.2,"blocks_per_100":2.2,"turnovers_per_100":2.5,"personal_fouls_per_100":3.2},
                {"number":"12","name":"Darian Perry","position":"G","height":74,"weight":182,"class":"JR","minutes_per_game":22.0,"ppg":9.2,"rpg":2.8,"apg":3.2,"bpg":0.1,"spg":0.9,"fga_per_100":15.5,"three_pa_per_100":8.5,"three_point_pct":0.358,"two_point_pct":0.455,"free_throw_pct":0.802,"offensive_rebounds_per_100":0.9,"defensive_rebounds_per_100":4.0,"assists_per_100":5.8,"steals_per_100":1.5,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.2},
                {"number":"33","name":"Jaxon Kohler","position":"F","height":82,"weight":225,"class":"SR","minutes_per_game":20.0,"ppg":7.8,"rpg":5.8,"apg":0.8,"bpg":0.8,"spg":0.4,"fga_per_100":13.8,"three_pa_per_100":2.5,"three_point_pct":0.328,"two_point_pct":0.515,"free_throw_pct":0.712,"offensive_rebounds_per_100":3.0,"defensive_rebounds_per_100":8.0,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":1.5,"turnovers_per_100":2.0,"personal_fouls_per_100":3.5},
                {"number":"10","name":"Blue Cain","position":"G","height":73,"weight":172,"class":"SO","minutes_per_game":16.0,"ppg":6.2,"rpg":2.0,"apg":2.2,"bpg":0.1,"spg":0.6,"fga_per_100":13.0,"three_pa_per_100":8.0,"three_point_pct":0.348,"two_point_pct":0.445,"free_throw_pct":0.788,"offensive_rebounds_per_100":0.6,"defensive_rebounds_per_100":2.8,"assists_per_100":3.8,"steals_per_100":1.0,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.0},
                {"number":"21","name":"Tyrin Lawrence","position":"G","height":76,"weight":188,"class":"SR","minutes_per_game":14.0,"ppg":5.0,"rpg":1.8,"apg":1.5,"bpg":0.1,"spg":0.4,"fga_per_100":11.8,"three_pa_per_100":7.2,"three_point_pct":0.342,"two_point_pct":0.438,"free_throw_pct":0.775,"offensive_rebounds_per_100":0.5,"defensive_rebounds_per_100":2.5,"assists_per_100":2.8,"steals_per_100":0.7,"blocks_per_100":0.2,"turnovers_per_100":2.2,"personal_fouls_per_100":2.0}
            ]
        },
        {
            "name": "Kentucky",
            "nickname": "Wildcats",
            "primaryColor": "#0033A0",
            "record": "",
            "logo": "",
            "head_coach": "Mark Pope",
            "city": "Lexington",
            "possessions_per_game": 73.0,
            "offensive_rebound_pct": 0.29,
            "defensive_rebound_pct": 0.71,
            "assist_rate": 0.57,
            "team_fouls_per_game": 17,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"12","name":"Lamont Butler","position":"G","height":76,"weight":185,"class":"SR","minutes_per_game":32.0,"ppg":16.5,"rpg":3.2,"apg":5.5,"bpg":0.2,"spg":1.2,"fga_per_100":19.5,"three_pa_per_100":8.8,"three_point_pct":0.368,"two_point_pct":0.492,"free_throw_pct":0.845,"offensive_rebounds_per_100":0.9,"defensive_rebounds_per_100":4.5,"assists_per_100":10.2,"steals_per_100":2.1,"blocks_per_100":0.4,"turnovers_per_100":3.5,"personal_fouls_per_100":2.2},
                {"number":"3","name":"Otega Oweh","position":"G","height":77,"weight":200,"class":"JR","minutes_per_game":30.0,"ppg":15.2,"rpg":5.5,"apg":2.8,"bpg":0.5,"spg":1.1,"fga_per_100":19.8,"three_pa_per_100":7.5,"three_point_pct":0.358,"two_point_pct":0.508,"free_throw_pct":0.792,"offensive_rebounds_per_100":2.2,"defensive_rebounds_per_100":7.5,"assists_per_100":5.2,"steals_per_100":1.9,"blocks_per_100":1.0,"turnovers_per_100":3.0,"personal_fouls_per_100":2.5},
                {"number":"33","name":"Andrew Carr","position":"F","height":82,"weight":215,"class":"SR","minutes_per_game":27.0,"ppg":12.8,"rpg":6.5,"apg":2.0,"bpg":0.8,"spg":0.7,"fga_per_100":16.5,"three_pa_per_100":6.5,"three_point_pct":0.372,"two_point_pct":0.515,"free_throw_pct":0.778,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":8.8,"assists_per_100":3.8,"steals_per_100":1.2,"blocks_per_100":1.5,"turnovers_per_100":2.5,"personal_fouls_per_100":2.8},
                {"number":"2","name":"Koby Brea","position":"G","height":77,"weight":190,"class":"SR","minutes_per_game":28.0,"ppg":13.5,"rpg":3.2,"apg":1.8,"bpg":0.2,"spg":0.8,"fga_per_100":17.2,"three_pa_per_100":11.5,"three_point_pct":0.415,"two_point_pct":0.448,"free_throw_pct":0.862,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":4.5,"assists_per_100":3.2,"steals_per_100":1.4,"blocks_per_100":0.4,"turnovers_per_100":2.0,"personal_fouls_per_100":2.0},
                {"number":"5","name":"Amari Williams","position":"C","height":84,"weight":240,"class":"SR","minutes_per_game":25.0,"ppg":10.5,"rpg":8.8,"apg":1.2,"bpg":2.5,"spg":0.6,"fga_per_100":14.8,"three_pa_per_100":0.8,"three_point_pct":0.302,"two_point_pct":0.565,"free_throw_pct":0.695,"offensive_rebounds_per_100":4.8,"defensive_rebounds_per_100":11.5,"assists_per_100":2.2,"steals_per_100":1.0,"blocks_per_100":4.8,"turnovers_per_100":2.2,"personal_fouls_per_100":3.5},
                {"number":"4","name":"Brandon Garrison","position":"F","height":83,"weight":230,"class":"SO","minutes_per_game":22.0,"ppg":9.2,"rpg":6.2,"apg":0.8,"bpg":1.2,"spg":0.5,"fga_per_100":14.5,"three_pa_per_100":1.5,"three_point_pct":0.318,"two_point_pct":0.545,"free_throw_pct":0.708,"offensive_rebounds_per_100":3.5,"defensive_rebounds_per_100":8.5,"assists_per_100":1.5,"steals_per_100":0.9,"blocks_per_100":2.2,"turnovers_per_100":2.0,"personal_fouls_per_100":3.5},
                {"number":"1","name":"Travis Perry","position":"G","height":73,"weight":175,"class":"SO","minutes_per_game":20.0,"ppg":8.8,"rpg":2.0,"apg":3.5,"bpg":0.1,"spg":0.8,"fga_per_100":15.2,"three_pa_per_100":9.5,"three_point_pct":0.382,"two_point_pct":0.458,"free_throw_pct":0.828,"offensive_rebounds_per_100":0.6,"defensive_rebounds_per_100":2.8,"assists_per_100":6.5,"steals_per_100":1.4,"blocks_per_100":0.2,"turnovers_per_100":2.8,"personal_fouls_per_100":2.2},
                {"number":"24","name":"Trent Noah","position":"G","height":75,"weight":185,"class":"SR","minutes_per_game":17.0,"ppg":6.5,"rpg":2.2,"apg":1.8,"bpg":0.1,"spg":0.5,"fga_per_100":12.8,"three_pa_per_100":8.2,"three_point_pct":0.368,"two_point_pct":0.445,"free_throw_pct":0.805,"offensive_rebounds_per_100":0.7,"defensive_rebounds_per_100":3.0,"assists_per_100":3.2,"steals_per_100":0.9,"blocks_per_100":0.2,"turnovers_per_100":2.2,"personal_fouls_per_100":2.0},
                {"number":"13","name":"Somto Cyril","position":"C","height":84,"weight":235,"class":"SO","minutes_per_game":14.0,"ppg":4.8,"rpg":4.5,"apg":0.5,"bpg":1.5,"spg":0.3,"fga_per_100":11.2,"three_pa_per_100":0.5,"three_point_pct":0.285,"two_point_pct":0.545,"free_throw_pct":0.665,"offensive_rebounds_per_100":3.0,"defensive_rebounds_per_100":7.2,"assists_per_100":1.0,"steals_per_100":0.5,"blocks_per_100":3.0,"turnovers_per_100":1.8,"personal_fouls_per_100":4.0}
            ]
        },
        {
            "name": "LSU",
            "nickname": "Tigers",
            "primaryColor": "#461D7C",
            "record": "",
            "logo": "",
            "head_coach": "Matt McMahon",
            "city": "Baton Rouge",
            "possessions_per_game": 72.5,
            "offensive_rebound_pct": 0.30,
            "defensive_rebound_pct": 0.70,
            "assist_rate": 0.52,
            "team_fouls_per_game": 18,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"3","name":"Cam Carter","position":"G","height":76,"weight":190,"class":"JR","minutes_per_game":31.0,"ppg":17.2,"rpg":4.2,"apg":3.5,"bpg":0.3,"spg":1.2,"fga_per_100":21.2,"three_pa_per_100":9.8,"three_point_pct":0.372,"two_point_pct":0.495,"free_throw_pct":0.832,"offensive_rebounds_per_100":1.5,"defensive_rebounds_per_100":5.8,"assists_per_100":6.5,"steals_per_100":2.0,"blocks_per_100":0.5,"turnovers_per_100":3.2,"personal_fouls_per_100":2.5},
                {"number":"1","name":"Daimion Collins","position":"F","height":83,"weight":215,"class":"SR","minutes_per_game":28.0,"ppg":14.5,"rpg":8.5,"apg":1.5,"bpg":2.2,"spg":0.8,"fga_per_100":18.2,"three_pa_per_100":2.5,"three_point_pct":0.322,"two_point_pct":0.548,"free_throw_pct":0.715,"offensive_rebounds_per_100":4.5,"defensive_rebounds_per_100":11.0,"assists_per_100":2.8,"steals_per_100":1.4,"blocks_per_100":4.2,"turnovers_per_100":2.5,"personal_fouls_per_100":3.5},
                {"number":"5","name":"Curtis Williams Jr.","position":"G","height":75,"weight":182,"class":"SR","minutes_per_game":27.0,"ppg":13.2,"rpg":3.0,"apg":4.5,"bpg":0.2,"spg":1.0,"fga_per_100":18.5,"three_pa_per_100":9.5,"three_point_pct":0.362,"two_point_pct":0.475,"free_throw_pct":0.812,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":4.2,"assists_per_100":8.2,"steals_per_100":1.8,"blocks_per_100":0.4,"turnovers_per_100":3.5,"personal_fouls_per_100":2.2},
                {"number":"2","name":"Mike Williams III","position":"G","height":77,"weight":198,"class":"SR","minutes_per_game":26.0,"ppg":11.8,"rpg":4.5,"apg":2.2,"bpg":0.4,"spg":0.9,"fga_per_100":17.2,"three_pa_per_100":8.2,"three_point_pct":0.355,"two_point_pct":0.492,"free_throw_pct":0.795,"offensive_rebounds_per_100":1.8,"defensive_rebounds_per_100":6.2,"assists_per_100":4.0,"steals_per_100":1.5,"blocks_per_100":0.8,"turnovers_per_100":2.8,"personal_fouls_per_100":2.5},
                {"number":"23","name":"Jalen Reed","position":"C","height":84,"weight":238,"class":"JR","minutes_per_game":24.0,"ppg":10.5,"rpg":7.8,"apg":0.8,"bpg":2.0,"spg":0.5,"fga_per_100":15.5,"three_pa_per_100":0.8,"three_point_pct":0.292,"two_point_pct":0.562,"free_throw_pct":0.685,"offensive_rebounds_per_100":4.2,"defensive_rebounds_per_100":10.2,"assists_per_100":1.5,"steals_per_100":0.9,"blocks_per_100":4.0,"turnovers_per_100":2.2,"personal_fouls_per_100":3.8},
                {"number":"14","name":"Jordan Wright","position":"F","height":80,"weight":210,"class":"SR","minutes_per_game":22.0,"ppg":9.2,"rpg":5.2,"apg":1.5,"bpg":0.8,"spg":0.7,"fga_per_100":14.8,"three_pa_per_100":5.5,"three_point_pct":0.348,"two_point_pct":0.512,"free_throw_pct":0.748,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.0,"assists_per_100":2.8,"steals_per_100":1.2,"blocks_per_100":1.5,"turnovers_per_100":2.2,"personal_fouls_per_100":3.0},
                {"number":"11","name":"Corey Chest","position":"G","height":74,"weight":180,"class":"SO","minutes_per_game":18.0,"ppg":7.5,"rpg":2.5,"apg":2.2,"bpg":0.1,"spg":0.6,"fga_per_100":13.8,"three_pa_per_100":8.2,"three_point_pct":0.358,"two_point_pct":0.452,"free_throw_pct":0.795,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.5,"assists_per_100":4.0,"steals_per_100":1.0,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.0},
                {"number":"4","name":"Tyrell Ward","position":"F","height":80,"weight":208,"class":"FR","minutes_per_game":15.0,"ppg":5.5,"rpg":4.2,"apg":0.8,"bpg":0.6,"spg":0.4,"fga_per_100":12.2,"three_pa_per_100":3.8,"three_point_pct":0.332,"two_point_pct":0.498,"free_throw_pct":0.712,"offensive_rebounds_per_100":2.2,"defensive_rebounds_per_100":5.8,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":1.2,"turnovers_per_100":2.0,"personal_fouls_per_100":3.0},
                {"number":"10","name":"Hunter Dean","position":"G","height":73,"weight":175,"class":"FR","minutes_per_game":13.0,"ppg":4.5,"rpg":1.5,"apg":2.0,"bpg":0.1,"spg":0.4,"fga_per_100":11.2,"three_pa_per_100":7.5,"three_point_pct":0.338,"two_point_pct":0.438,"free_throw_pct":0.775,"offensive_rebounds_per_100":0.5,"defensive_rebounds_per_100":2.2,"assists_per_100":3.5,"steals_per_100":0.7,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.0}
            ]
        },
        {
            "name": "Mississippi State",
            "nickname": "Bulldogs",
            "primaryColor": "#5D1725",
            "record": "",
            "logo": "",
            "head_coach": "Chris Jans",
            "city": "Starkville",
            "possessions_per_game": 70.5,
            "offensive_rebound_pct": 0.31,
            "defensive_rebound_pct": 0.69,
            "assist_rate": 0.50,
            "team_fouls_per_game": 19,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"1","name":"Josh Hubbard","position":"G","height":75,"weight":185,"class":"SR","minutes_per_game":31.0,"ppg":18.5,"rpg":3.5,"apg":4.2,"bpg":0.2,"spg":1.1,"fga_per_100":22.5,"three_pa_per_100":10.5,"three_point_pct":0.372,"two_point_pct":0.488,"free_throw_pct":0.845,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":5.0,"assists_per_100":7.8,"steals_per_100":1.9,"blocks_per_100":0.4,"turnovers_per_100":3.5,"personal_fouls_per_100":2.2},
                {"number":"3","name":"Claudell Harris Jr.","position":"G","height":76,"weight":188,"class":"JR","minutes_per_game":28.0,"ppg":13.8,"rpg":3.8,"apg":3.5,"bpg":0.2,"spg":1.0,"fga_per_100":19.2,"three_pa_per_100":9.2,"three_point_pct":0.358,"two_point_pct":0.478,"free_throw_pct":0.818,"offensive_rebounds_per_100":1.2,"defensive_rebounds_per_100":5.5,"assists_per_100":6.5,"steals_per_100":1.7,"blocks_per_100":0.4,"turnovers_per_100":3.2,"personal_fouls_per_100":2.5},
                {"number":"5","name":"RJ Melendez","position":"F","height":79,"weight":205,"class":"SR","minutes_per_game":25.0,"ppg":11.2,"rpg":6.5,"apg":1.5,"bpg":0.9,"spg":0.7,"fga_per_100":16.8,"three_pa_per_100":5.5,"three_point_pct":0.345,"two_point_pct":0.518,"free_throw_pct":0.748,"offensive_rebounds_per_100":2.8,"defensive_rebounds_per_100":8.8,"assists_per_100":2.8,"steals_per_100":1.2,"blocks_per_100":1.8,"turnovers_per_100":2.5,"personal_fouls_per_100":3.2},
                {"number":"10","name":"Tolu Taiwo","position":"C","height":84,"weight":240,"class":"JR","minutes_per_game":24.0,"ppg":10.5,"rpg":8.0,"apg":0.8,"bpg":2.0,"spg":0.5,"fga_per_100":15.8,"three_pa_per_100":0.8,"three_point_pct":0.295,"two_point_pct":0.558,"free_throw_pct":0.685,"offensive_rebounds_per_100":4.5,"defensive_rebounds_per_100":10.8,"assists_per_100":1.5,"steals_per_100":0.9,"blocks_per_100":4.0,"turnovers_per_100":2.2,"personal_fouls_per_100":4.0},
                {"number":"2","name":"Shawn Jones Jr.","position":"F","height":80,"weight":210,"class":"SR","minutes_per_game":23.0,"ppg":9.8,"rpg":5.8,"apg":1.2,"bpg":1.0,"spg":0.6,"fga_per_100":15.5,"three_pa_per_100":4.2,"three_point_pct":0.338,"two_point_pct":0.512,"free_throw_pct":0.722,"offensive_rebounds_per_100":2.8,"defensive_rebounds_per_100":7.8,"assists_per_100":2.2,"steals_per_100":1.0,"blocks_per_100":2.0,"turnovers_per_100":2.2,"personal_fouls_per_100":3.5},
                {"number":"4","name":"Dionte Blanchard","position":"G","height":73,"weight":175,"class":"SO","minutes_per_game":20.0,"ppg":8.2,"rpg":2.2,"apg":3.5,"bpg":0.1,"spg":0.8,"fga_per_100":14.5,"three_pa_per_100":9.0,"three_point_pct":0.362,"two_point_pct":0.455,"free_throw_pct":0.808,"offensive_rebounds_per_100":0.7,"defensive_rebounds_per_100":3.2,"assists_per_100":6.5,"steals_per_100":1.4,"blocks_per_100":0.2,"turnovers_per_100":3.0,"personal_fouls_per_100":2.2},
                {"number":"22","name":"Ante Brzovic","position":"F","height":82,"weight":220,"class":"JR","minutes_per_game":18.0,"ppg":7.2,"rpg":5.2,"apg":0.8,"bpg":0.8,"spg":0.4,"fga_per_100":13.5,"three_pa_per_100":4.8,"three_point_pct":0.348,"two_point_pct":0.505,"free_throw_pct":0.732,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.2,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":1.5,"turnovers_per_100":2.0,"personal_fouls_per_100":3.0},
                {"number":"11","name":"Cameron Matthews","position":"G","height":77,"weight":195,"class":"SR","minutes_per_game":16.0,"ppg":5.8,"rpg":3.2,"apg":1.5,"bpg":0.3,"spg":0.5,"fga_per_100":12.8,"three_pa_per_100":6.5,"three_point_pct":0.342,"two_point_pct":0.468,"free_throw_pct":0.758,"offensive_rebounds_per_100":1.2,"defensive_rebounds_per_100":4.5,"assists_per_100":2.8,"steals_per_100":0.9,"blocks_per_100":0.6,"turnovers_per_100":2.0,"personal_fouls_per_100":2.5},
                {"number":"14","name":"Keshawn Murphy","position":"F","height":81,"weight":215,"class":"SO","minutes_per_game":13.0,"ppg":4.5,"rpg":4.0,"apg":0.5,"bpg":0.6,"spg":0.3,"fga_per_100":11.5,"three_pa_per_100":2.5,"three_point_pct":0.322,"two_point_pct":0.498,"free_throw_pct":0.698,"offensive_rebounds_per_100":2.2,"defensive_rebounds_per_100":5.8,"assists_per_100":1.0,"steals_per_100":0.5,"blocks_per_100":1.2,"turnovers_per_100":1.8,"personal_fouls_per_100":3.5}
            ]
        },
        {
            "name": "Ole Miss",
            "nickname": "Rebels",
            "primaryColor": "#14213D",
            "record": "",
            "logo": "",
            "head_coach": "Chris Beard",
            "city": "Oxford",
            "possessions_per_game": 72.0,
            "offensive_rebound_pct": 0.29,
            "defensive_rebound_pct": 0.71,
            "assist_rate": 0.53,
            "team_fouls_per_game": 17,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"0","name":"Matthew Murrell","position":"G","height":76,"weight":185,"class":"SR","minutes_per_game":32.0,"ppg":18.2,"rpg":3.5,"apg":3.8,"bpg":0.2,"spg":1.1,"fga_per_100":21.5,"three_pa_per_100":11.2,"three_point_pct":0.385,"two_point_pct":0.488,"free_throw_pct":0.848,"offensive_rebounds_per_100":1.2,"defensive_rebounds_per_100":5.0,"assists_per_100":7.0,"steals_per_100":1.9,"blocks_per_100":0.4,"turnovers_per_100":3.0,"personal_fouls_per_100":2.2},
                {"number":"3","name":"Sean Pedulla","position":"G","height":73,"weight":175,"class":"SR","minutes_per_game":29.0,"ppg":15.5,"rpg":2.8,"apg":5.2,"bpg":0.1,"spg":1.2,"fga_per_100":20.2,"three_pa_per_100":10.8,"three_point_pct":0.375,"two_point_pct":0.468,"free_throw_pct":0.862,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.8,"assists_per_100":9.8,"steals_per_100":2.1,"blocks_per_100":0.2,"turnovers_per_100":3.8,"personal_fouls_per_100":2.0},
                {"number":"1","name":"Malik Dia","position":"F","height":80,"weight":210,"class":"SR","minutes_per_game":27.0,"ppg":12.8,"rpg":5.8,"apg":1.8,"bpg":0.8,"spg":0.8,"fga_per_100":17.5,"three_pa_per_100":5.5,"three_point_pct":0.352,"two_point_pct":0.518,"free_throw_pct":0.762,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.8,"assists_per_100":3.2,"steals_per_100":1.4,"blocks_per_100":1.5,"turnovers_per_100":2.5,"personal_fouls_per_100":2.8},
                {"number":"5","name":"Dre Davis","position":"F","height":79,"weight":205,"class":"JR","minutes_per_game":25.0,"ppg":11.5,"rpg":5.5,"apg":1.5,"bpg":0.7,"spg":0.7,"fga_per_100":16.8,"three_pa_per_100":4.8,"three_point_pct":0.342,"two_point_pct":0.522,"free_throw_pct":0.745,"offensive_rebounds_per_100":2.2,"defensive_rebounds_per_100":7.5,"assists_per_100":2.8,"steals_per_100":1.2,"blocks_per_100":1.4,"turnovers_per_100":2.2,"personal_fouls_per_100":3.0},
                {"number":"14","name":"Jaylen Murray","position":"C","height":84,"weight":240,"class":"JR","minutes_per_game":23.0,"ppg":9.8,"rpg":7.8,"apg":0.8,"bpg":2.0,"spg":0.5,"fga_per_100":15.2,"three_pa_per_100":0.8,"three_point_pct":0.292,"two_point_pct":0.558,"free_throw_pct":0.678,"offensive_rebounds_per_100":4.2,"defensive_rebounds_per_100":10.5,"assists_per_100":1.5,"steals_per_100":0.9,"blocks_per_100":3.8,"turnovers_per_100":2.0,"personal_fouls_per_100":3.8},
                {"number":"10","name":"Jaemyn Brakefield","position":"F","height":81,"weight":215,"class":"SR","minutes_per_game":22.0,"ppg":9.2,"rpg":5.5,"apg":1.2,"bpg":0.7,"spg":0.6,"fga_per_100":14.8,"three_pa_per_100":4.5,"three_point_pct":0.345,"two_point_pct":0.508,"free_throw_pct":0.735,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.5,"assists_per_100":2.2,"steals_per_100":1.0,"blocks_per_100":1.4,"turnovers_per_100":2.0,"personal_fouls_per_100":3.2},
                {"number":"4","name":"Davon Barnes","position":"G","height":75,"weight":185,"class":"SO","minutes_per_game":18.0,"ppg":7.2,"rpg":2.5,"apg":2.2,"bpg":0.1,"spg":0.6,"fga_per_100":13.5,"three_pa_per_100":8.5,"three_point_pct":0.362,"two_point_pct":0.452,"free_throw_pct":0.808,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.5,"assists_per_100":4.0,"steals_per_100":1.0,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.2},
                {"number":"2","name":"Allen Flanigan","position":"F","height":79,"weight":205,"class":"SR","minutes_per_game":16.0,"ppg":6.2,"rpg":3.8,"apg":1.0,"bpg":0.4,"spg":0.4,"fga_per_100":12.5,"three_pa_per_100":3.8,"three_point_pct":0.335,"two_point_pct":0.498,"free_throw_pct":0.725,"offensive_rebounds_per_100":1.8,"defensive_rebounds_per_100":5.2,"assists_per_100":1.8,"steals_per_100":0.7,"blocks_per_100":0.8,"turnovers_per_100":1.8,"personal_fouls_per_100":3.0},
                {"number":"11","name":"Jaylon Jones","position":"G","height":74,"weight":180,"class":"JR","minutes_per_game":13.0,"ppg":4.8,"rpg":1.8,"apg":1.5,"bpg":0.1,"spg":0.4,"fga_per_100":11.8,"three_pa_per_100":7.2,"three_point_pct":0.348,"two_point_pct":0.442,"free_throw_pct":0.785,"offensive_rebounds_per_100":0.5,"defensive_rebounds_per_100":2.5,"assists_per_100":2.8,"steals_per_100":0.7,"blocks_per_100":0.2,"turnovers_per_100":2.2,"personal_fouls_per_100":2.0}
            ]
        },
        {
            "name": "Missouri",
            "nickname": "Tigers",
            "primaryColor": "#F1B82D",
            "record": "",
            "logo": "",
            "head_coach": "Dennis Gates",
            "city": "Columbia",
            "possessions_per_game": 71.5,
            "offensive_rebound_pct": 0.29,
            "defensive_rebound_pct": 0.71,
            "assist_rate": 0.53,
            "team_fouls_per_game": 17,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"1","name":"Tamar Bates","position":"G","height":76,"weight":190,"class":"SR","minutes_per_game":31.0,"ppg":16.8,"rpg":4.0,"apg":3.2,"bpg":0.3,"spg":1.0,"fga_per_100":21.0,"three_pa_per_100":9.5,"three_point_pct":0.368,"two_point_pct":0.492,"free_throw_pct":0.825,"offensive_rebounds_per_100":1.5,"defensive_rebounds_per_100":5.8,"assists_per_100":5.8,"steals_per_100":1.8,"blocks_per_100":0.5,"turnovers_per_100":3.0,"personal_fouls_per_100":2.4},
                {"number":"2","name":"Nick Honor","position":"G","height":72,"weight":170,"class":"SR","minutes_per_game":28.0,"ppg":13.5,"rpg":2.5,"apg":4.8,"bpg":0.1,"spg":1.1,"fga_per_100":18.8,"three_pa_per_100":10.5,"three_point_pct":0.382,"two_point_pct":0.462,"free_throw_pct":0.848,"offensive_rebounds_per_100":0.7,"defensive_rebounds_per_100":3.5,"assists_per_100":9.0,"steals_per_100":2.0,"blocks_per_100":0.2,"turnovers_per_100":3.5,"personal_fouls_per_100":2.0},
                {"number":"5","name":"Aidan Shaw","position":"F","height":82,"weight":215,"class":"SO","minutes_per_game":26.0,"ppg":12.5,"rpg":6.8,"apg":1.5,"bpg":1.2,"spg":0.8,"fga_per_100":17.5,"three_pa_per_100":4.5,"three_point_pct":0.342,"two_point_pct":0.528,"free_throw_pct":0.738,"offensive_rebounds_per_100":3.0,"defensive_rebounds_per_100":9.2,"assists_per_100":2.8,"steals_per_100":1.4,"blocks_per_100":2.2,"turnovers_per_100":2.5,"personal_fouls_per_100":3.2},
                {"number":"3","name":"Joshua Gray","position":"C","height":84,"weight":235,"class":"JR","minutes_per_game":24.0,"ppg":10.8,"rpg":8.2,"apg":1.0,"bpg":2.0,"spg":0.5,"fga_per_100":15.8,"three_pa_per_100":1.0,"three_point_pct":0.298,"two_point_pct":0.558,"free_throw_pct":0.695,"offensive_rebounds_per_100":4.5,"defensive_rebounds_per_100":11.0,"assists_per_100":1.8,"steals_per_100":0.9,"blocks_per_100":3.8,"turnovers_per_100":2.2,"personal_fouls_per_100":3.8},
                {"number":"4","name":"Caleb Grill","position":"G","height":75,"weight":180,"class":"SR","minutes_per_game":25.0,"ppg":11.2,"rpg":3.2,"apg":2.5,"bpg":0.1,"spg":0.8,"fga_per_100":16.8,"three_pa_per_100":10.8,"three_point_pct":0.395,"two_point_pct":0.455,"free_throw_pct":0.835,"offensive_rebounds_per_100":0.9,"defensive_rebounds_per_100":4.5,"assists_per_100":4.5,"steals_per_100":1.4,"blocks_per_100":0.2,"turnovers_per_100":2.2,"personal_fouls_per_100":2.0},
                {"number":"12","name":"Anthony Robinson II","position":"F","height":80,"weight":208,"class":"JR","minutes_per_game":22.0,"ppg":9.5,"rpg":5.5,"apg":1.5,"bpg":0.8,"spg":0.6,"fga_per_100":15.2,"three_pa_per_100":4.8,"three_point_pct":0.345,"two_point_pct":0.512,"free_throw_pct":0.742,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.5,"assists_per_100":2.8,"steals_per_100":1.0,"blocks_per_100":1.5,"turnovers_per_100":2.2,"personal_fouls_per_100":3.0},
                {"number":"11","name":"Marques Warrick","position":"G","height":75,"weight":185,"class":"SR","minutes_per_game":20.0,"ppg":8.5,"rpg":3.0,"apg":2.2,"bpg":0.2,"spg":0.7,"fga_per_100":14.8,"three_pa_per_100":8.5,"three_point_pct":0.372,"two_point_pct":0.462,"free_throw_pct":0.818,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":4.2,"assists_per_100":4.0,"steals_per_100":1.2,"blocks_per_100":0.4,"turnovers_per_100":2.2,"personal_fouls_per_100":2.2},
                {"number":"10","name":"Trent Pierce","position":"F","height":80,"weight":210,"class":"SO","minutes_per_game":16.0,"ppg":6.2,"rpg":4.5,"apg":0.8,"bpg":0.7,"spg":0.4,"fga_per_100":12.5,"three_pa_per_100":4.0,"three_point_pct":0.335,"two_point_pct":0.505,"free_throw_pct":0.712,"offensive_rebounds_per_100":2.2,"defensive_rebounds_per_100":6.2,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":1.4,"turnovers_per_100":2.0,"personal_fouls_per_100":3.2},
                {"number":"21","name":"Kaleb Brown","position":"G","height":74,"weight":178,"class":"FR","minutes_per_game":13.0,"ppg":4.8,"rpg":1.8,"apg":1.8,"bpg":0.1,"spg":0.4,"fga_per_100":11.5,"three_pa_per_100":7.5,"three_point_pct":0.342,"two_point_pct":0.442,"free_throw_pct":0.778,"offensive_rebounds_per_100":0.5,"defensive_rebounds_per_100":2.5,"assists_per_100":3.2,"steals_per_100":0.7,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.0}
            ]
        },
        {
            "name": "South Carolina",
            "nickname": "Gamecocks",
            "primaryColor": "#73000A",
            "record": "",
            "logo": "",
            "head_coach": "Lamont Paris",
            "city": "Columbia",
            "possessions_per_game": 70.0,
            "offensive_rebound_pct": 0.30,
            "defensive_rebound_pct": 0.70,
            "assist_rate": 0.51,
            "team_fouls_per_game": 18,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"2","name":"Meechie Johnson","position":"G","height":72,"weight":172,"class":"SR","minutes_per_game":31.0,"ppg":17.8,"rpg":3.2,"apg":4.5,"bpg":0.2,"spg":1.2,"fga_per_100":22.8,"three_pa_per_100":11.5,"three_point_pct":0.378,"two_point_pct":0.478,"free_throw_pct":0.858,"offensive_rebounds_per_100":0.9,"defensive_rebounds_per_100":4.5,"assists_per_100":8.5,"steals_per_100":2.1,"blocks_per_100":0.4,"turnovers_per_100":3.5,"personal_fouls_per_100":2.2},
                {"number":"5","name":"B.J. Mack","position":"F","height":80,"weight":210,"class":"SR","minutes_per_game":28.0,"ppg":14.5,"rpg":7.2,"apg":2.0,"bpg":1.0,"spg":0.8,"fga_per_100":19.5,"three_pa_per_100":5.8,"three_point_pct":0.355,"two_point_pct":0.522,"free_throw_pct":0.762,"offensive_rebounds_per_100":3.2,"defensive_rebounds_per_100":9.8,"assists_per_100":3.5,"steals_per_100":1.4,"blocks_per_100":2.0,"turnovers_per_100":2.8,"personal_fouls_per_100":3.2},
                {"number":"1","name":"Collin Murray-Boyles","position":"F","height":80,"weight":215,"class":"SO","minutes_per_game":26.0,"ppg":12.8,"rpg":7.5,"apg":1.8,"bpg":1.5,"spg":0.9,"fga_per_100":17.2,"three_pa_per_100":3.2,"three_point_pct":0.335,"two_point_pct":0.535,"free_throw_pct":0.728,"offensive_rebounds_per_100":3.8,"defensive_rebounds_per_100":10.2,"assists_per_100":3.2,"steals_per_100":1.5,"blocks_per_100":2.8,"turnovers_per_100":2.5,"personal_fouls_per_100":3.5},
                {"number":"3","name":"Jamarii Thomas","position":"G","height":73,"weight":175,"class":"JR","minutes_per_game":25.0,"ppg":11.5,"rpg":2.8,"apg":4.5,"bpg":0.1,"spg":1.0,"fga_per_100":17.8,"three_pa_per_100":9.5,"three_point_pct":0.368,"two_point_pct":0.468,"free_throw_pct":0.828,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":4.0,"assists_per_100":8.5,"steals_per_100":1.8,"blocks_per_100":0.2,"turnovers_per_100":3.5,"personal_fouls_per_100":2.2},
                {"number":"14","name":"GG Jackson II","position":"F","height":82,"weight":210,"class":"SO","minutes_per_game":24.0,"ppg":10.8,"rpg":6.2,"apg":1.2,"bpg":1.0,"spg":0.6,"fga_per_100":16.5,"three_pa_per_100":4.5,"three_point_pct":0.342,"two_point_pct":0.525,"free_throw_pct":0.718,"offensive_rebounds_per_100":2.8,"defensive_rebounds_per_100":8.5,"assists_per_100":2.2,"steals_per_100":1.0,"blocks_per_100":2.0,"turnovers_per_100":2.2,"personal_fouls_per_100":3.2},
                {"number":"4","name":"Zachary Davis","position":"C","height":84,"weight":238,"class":"JR","minutes_per_game":22.0,"ppg":9.2,"rpg":7.5,"apg":0.8,"bpg":1.8,"spg":0.5,"fga_per_100":14.5,"three_pa_per_100":0.8,"three_point_pct":0.288,"two_point_pct":0.552,"free_throw_pct":0.672,"offensive_rebounds_per_100":4.2,"defensive_rebounds_per_100":10.5,"assists_per_100":1.5,"steals_per_100":0.9,"blocks_per_100":3.5,"turnovers_per_100":2.0,"personal_fouls_per_100":4.0},
                {"number":"10","name":"Ta'Lon Cooper","position":"G","height":72,"weight":168,"class":"SR","minutes_per_game":18.0,"ppg":7.5,"rpg":2.0,"apg":3.5,"bpg":0.1,"spg":0.7,"fga_per_100":14.2,"three_pa_per_100":9.2,"three_point_pct":0.375,"two_point_pct":0.452,"free_throw_pct":0.842,"offensive_rebounds_per_100":0.5,"defensive_rebounds_per_100":2.8,"assists_per_100":6.5,"steals_per_100":1.2,"blocks_per_100":0.2,"turnovers_per_100":3.2,"personal_fouls_per_100":2.0},
                {"number":"22","name":"Cam Scott","position":"G","height":76,"weight":188,"class":"FR","minutes_per_game":15.0,"ppg":5.8,"rpg":2.5,"apg":1.8,"bpg":0.2,"spg":0.5,"fga_per_100":12.5,"three_pa_per_100":7.5,"three_point_pct":0.352,"two_point_pct":0.452,"free_throw_pct":0.778,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.5,"assists_per_100":3.2,"steals_per_100":0.9,"blocks_per_100":0.4,"turnovers_per_100":2.2,"personal_fouls_per_100":2.2},
                {"number":"11","name":"Nicholas Pringle","position":"C","height":83,"weight":232,"class":"SR","minutes_per_game":13.0,"ppg":4.5,"rpg":4.5,"apg":0.5,"bpg":1.2,"spg":0.3,"fga_per_100":11.2,"three_pa_per_100":0.5,"three_point_pct":0.282,"two_point_pct":0.548,"free_throw_pct":0.655,"offensive_rebounds_per_100":2.8,"defensive_rebounds_per_100":7.0,"assists_per_100":1.0,"steals_per_100":0.5,"blocks_per_100":2.5,"turnovers_per_100":1.8,"personal_fouls_per_100":4.0}
            ]
        },
        {
            "name": "Tennessee",
            "nickname": "Volunteers",
            "primaryColor": "#FF8200",
            "record": "",
            "logo": "",
            "head_coach": "Rick Barnes",
            "city": "Knoxville",
            "possessions_per_game": 68.0,
            "offensive_rebound_pct": 0.28,
            "defensive_rebound_pct": 0.72,
            "assist_rate": 0.52,
            "team_fouls_per_game": 15,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"2","name":"Chaz Lanier","position":"G","height":76,"weight":185,"class":"SR","minutes_per_game":33.0,"ppg":19.5,"rpg":3.8,"apg":2.5,"bpg":0.3,"spg":0.9,"fga_per_100":22.5,"three_pa_per_100":11.8,"three_point_pct":0.392,"two_point_pct":0.495,"free_throw_pct":0.855,"offensive_rebounds_per_100":1.2,"defensive_rebounds_per_100":5.5,"assists_per_100":4.5,"steals_per_100":1.5,"blocks_per_100":0.5,"turnovers_per_100":2.8,"personal_fouls_per_100":2.2},
                {"number":"3","name":"Zakai Zeigler","position":"G","height":71,"weight":165,"class":"SR","minutes_per_game":32.0,"ppg":13.8,"rpg":3.5,"apg":6.8,"bpg":0.1,"spg":2.0,"fga_per_100":17.5,"three_pa_per_100":8.5,"three_point_pct":0.368,"two_point_pct":0.472,"free_throw_pct":0.815,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":5.0,"assists_per_100":12.5,"steals_per_100":3.5,"blocks_per_100":0.2,"turnovers_per_100":3.8,"personal_fouls_per_100":2.5},
                {"number":"5","name":"Igor Milicic Jr.","position":"C","height":84,"weight":230,"class":"SO","minutes_per_game":25.0,"ppg":12.5,"rpg":8.5,"apg":1.0,"bpg":2.2,"spg":0.6,"fga_per_100":16.8,"three_pa_per_100":1.5,"three_point_pct":0.318,"two_point_pct":0.562,"free_throw_pct":0.708,"offensive_rebounds_per_100":4.8,"defensive_rebounds_per_100":11.2,"assists_per_100":1.8,"steals_per_100":1.0,"blocks_per_100":4.2,"turnovers_per_100":2.2,"personal_fouls_per_100":3.5},
                {"number":"1","name":"Jordan Gainey","position":"G","height":75,"weight":183,"class":"SR","minutes_per_game":27.0,"ppg":14.2,"rpg":3.0,"apg":3.5,"bpg":0.2,"spg":1.0,"fga_per_100":19.8,"three_pa_per_100":10.5,"three_point_pct":0.382,"two_point_pct":0.478,"free_throw_pct":0.838,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":4.5,"assists_per_100":6.5,"steals_per_100":1.8,"blocks_per_100":0.4,"turnovers_per_100":3.0,"personal_fouls_per_100":2.2},
                {"number":"4","name":"Felix Okpara","position":"C","height":84,"weight":240,"class":"JR","minutes_per_game":24.0,"ppg":10.8,"rpg":8.8,"apg":1.0,"bpg":2.5,"spg":0.6,"fga_per_100":15.5,"three_pa_per_100":0.5,"three_point_pct":0.285,"two_point_pct":0.572,"free_throw_pct":0.685,"offensive_rebounds_per_100":4.5,"defensive_rebounds_per_100":11.8,"assists_per_100":1.8,"steals_per_100":1.0,"blocks_per_100":4.8,"turnovers_per_100":2.2,"personal_fouls_per_100":3.8},
                {"number":"11","name":"JP Estrella","position":"F","height":83,"weight":220,"class":"SR","minutes_per_game":22.0,"ppg":9.5,"rpg":6.5,"apg":1.2,"bpg":1.0,"spg":0.5,"fga_per_100":14.8,"three_pa_per_100":4.8,"three_point_pct":0.355,"two_point_pct":0.522,"free_throw_pct":0.748,"offensive_rebounds_per_100":2.8,"defensive_rebounds_per_100":9.0,"assists_per_100":2.2,"steals_per_100":0.9,"blocks_per_100":2.0,"turnovers_per_100":2.2,"personal_fouls_per_100":3.0},
                {"number":"12","name":"Dalton Knecht","position":"G","height":78,"weight":198,"class":"SR","minutes_per_game":20.0,"ppg":8.8,"rpg":3.5,"apg":1.5,"bpg":0.3,"spg":0.6,"fga_per_100":15.5,"three_pa_per_100":9.8,"three_point_pct":0.388,"two_point_pct":0.458,"free_throw_pct":0.842,"offensive_rebounds_per_100":1.2,"defensive_rebounds_per_100":5.0,"assists_per_100":2.8,"steals_per_100":1.0,"blocks_per_100":0.5,"turnovers_per_100":2.0,"personal_fouls_per_100":2.2},
                {"number":"0","name":"Cade Phillips","position":"F","height":81,"weight":215,"class":"SO","minutes_per_game":17.0,"ppg":6.8,"rpg":4.8,"apg":0.8,"bpg":0.8,"spg":0.4,"fga_per_100":13.2,"three_pa_per_100":3.5,"three_point_pct":0.332,"two_point_pct":0.515,"free_throw_pct":0.712,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.0,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":1.5,"turnovers_per_100":2.0,"personal_fouls_per_100":3.2},
                {"number":"13","name":"Christian Anderson","position":"G","height":74,"weight":178,"class":"JR","minutes_per_game":14.0,"ppg":5.2,"rpg":2.0,"apg":2.0,"bpg":0.1,"spg":0.5,"fga_per_100":12.5,"three_pa_per_100":8.2,"three_point_pct":0.355,"two_point_pct":0.448,"free_throw_pct":0.792,"offensive_rebounds_per_100":0.6,"defensive_rebounds_per_100":2.8,"assists_per_100":3.5,"steals_per_100":0.9,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.0}
            ]
        },
        {
            "name": "Texas A&M",
            "nickname": "Aggies",
            "primaryColor": "#500000",
            "record": "",
            "logo": "",
            "head_coach": "Buzz Williams",
            "city": "College Station",
            "possessions_per_game": 71.0,
            "offensive_rebound_pct": 0.30,
            "defensive_rebound_pct": 0.70,
            "assist_rate": 0.51,
            "team_fouls_per_game": 18,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"1","name":"Wade Taylor IV","position":"G","height":72,"weight":175,"class":"SR","minutes_per_game":32.0,"ppg":18.5,"rpg":3.5,"apg":5.5,"bpg":0.2,"spg":1.4,"fga_per_100":22.0,"three_pa_per_100":10.8,"three_point_pct":0.375,"two_point_pct":0.485,"free_throw_pct":0.852,"offensive_rebounds_per_100":0.9,"defensive_rebounds_per_100":5.0,"assists_per_100":10.2,"steals_per_100":2.5,"blocks_per_100":0.4,"turnovers_per_100":3.8,"personal_fouls_per_100":2.2},
                {"number":"3","name":"Zhuric Phelps","position":"G","height":75,"weight":180,"class":"SR","minutes_per_game":28.0,"ppg":14.8,"rpg":3.2,"apg":4.2,"bpg":0.2,"spg":1.0,"fga_per_100":19.5,"three_pa_per_100":9.8,"three_point_pct":0.368,"two_point_pct":0.478,"free_throw_pct":0.828,"offensive_rebounds_per_100":1.0,"defensive_rebounds_per_100":4.5,"assists_per_100":7.8,"steals_per_100":1.8,"blocks_per_100":0.4,"turnovers_per_100":3.2,"personal_fouls_per_100":2.4},
                {"number":"12","name":"Henry Coleman III","position":"F","height":80,"weight":220,"class":"SR","minutes_per_game":27.0,"ppg":12.5,"rpg":7.2,"apg":1.5,"bpg":1.0,"spg":0.7,"fga_per_100":17.2,"three_pa_per_100":3.5,"three_point_pct":0.338,"two_point_pct":0.528,"free_throw_pct":0.752,"offensive_rebounds_per_100":3.5,"defensive_rebounds_per_100":9.8,"assists_per_100":2.8,"steals_per_100":1.2,"blocks_per_100":2.0,"turnovers_per_100":2.5,"personal_fouls_per_100":3.2},
                {"number":"4","name":"Solomon Washington","position":"C","height":84,"weight":238,"class":"JR","minutes_per_game":25.0,"ppg":11.2,"rpg":8.5,"apg":0.8,"bpg":2.2,"spg":0.6,"fga_per_100":16.5,"three_pa_per_100":1.0,"three_point_pct":0.298,"two_point_pct":0.562,"free_throw_pct":0.688,"offensive_rebounds_per_100":4.8,"defensive_rebounds_per_100":11.5,"assists_per_100":1.5,"steals_per_100":1.0,"blocks_per_100":4.2,"turnovers_per_100":2.2,"personal_fouls_per_100":3.8},
                {"number":"5","name":"Andersson Garcia","position":"F","height":80,"weight":210,"class":"SR","minutes_per_game":24.0,"ppg":10.5,"rpg":7.5,"apg":1.5,"bpg":1.0,"spg":0.8,"fga_per_100":15.8,"three_pa_per_100":3.2,"three_point_pct":0.332,"two_point_pct":0.522,"free_throw_pct":0.728,"offensive_rebounds_per_100":3.8,"defensive_rebounds_per_100":10.0,"assists_per_100":2.8,"steals_per_100":1.4,"blocks_per_100":2.0,"turnovers_per_100":2.2,"personal_fouls_per_100":3.5},
                {"number":"2","name":"Manny Obaseki","position":"G","height":75,"weight":182,"class":"JR","minutes_per_game":22.0,"ppg":9.2,"rpg":2.8,"apg":3.5,"bpg":0.1,"spg":0.8,"fga_per_100":15.5,"three_pa_per_100":9.2,"three_point_pct":0.362,"two_point_pct":0.462,"free_throw_pct":0.815,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":3.8,"assists_per_100":6.5,"steals_per_100":1.4,"blocks_per_100":0.2,"turnovers_per_100":2.8,"personal_fouls_per_100":2.2},
                {"number":"10","name":"Javion Small","position":"G","height":73,"weight":172,"class":"SR","minutes_per_game":18.0,"ppg":7.5,"rpg":2.2,"apg":3.2,"bpg":0.1,"spg":0.7,"fga_per_100":14.2,"three_pa_per_100":9.5,"three_point_pct":0.372,"two_point_pct":0.455,"free_throw_pct":0.838,"offensive_rebounds_per_100":0.6,"defensive_rebounds_per_100":3.0,"assists_per_100":5.8,"steals_per_100":1.2,"blocks_per_100":0.2,"turnovers_per_100":3.0,"personal_fouls_per_100":2.0},
                {"number":"23","name":"Julius Marble II","position":"C","height":83,"weight":235,"class":"SR","minutes_per_game":16.0,"ppg":6.2,"rpg":5.5,"apg":0.8,"bpg":1.2,"spg":0.4,"fga_per_100":13.2,"three_pa_per_100":0.8,"three_point_pct":0.288,"two_point_pct":0.548,"free_throw_pct":0.672,"offensive_rebounds_per_100":3.2,"defensive_rebounds_per_100":8.5,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":2.5,"turnovers_per_100":1.8,"personal_fouls_per_100":4.0},
                {"number":"11","name":"Eli Lawrence","position":"G","height":75,"weight":183,"class":"FR","minutes_per_game":13.0,"ppg":4.5,"rpg":1.8,"apg":1.8,"bpg":0.1,"spg":0.4,"fga_per_100":11.5,"three_pa_per_100":7.8,"three_point_pct":0.345,"two_point_pct":0.442,"free_throw_pct":0.775,"offensive_rebounds_per_100":0.5,"defensive_rebounds_per_100":2.5,"assists_per_100":3.2,"steals_per_100":0.7,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.0}
            ]
        },
        {
            "name": "Vanderbilt",
            "nickname": "Commodores",
            "primaryColor": "#866D4B",
            "record": "",
            "logo": "",
            "head_coach": "Mark Byington",
            "city": "Nashville",
            "possessions_per_game": 70.5,
            "offensive_rebound_pct": 0.27,
            "defensive_rebound_pct": 0.73,
            "assist_rate": 0.54,
            "team_fouls_per_game": 16,
            "home_fg_bonus": 0.02,
            "players": [
                {"number":"1","name":"Jason Edwards","position":"G","height":77,"weight":190,"class":"SO","minutes_per_game":30.0,"ppg":16.5,"rpg":4.5,"apg":3.2,"bpg":0.4,"spg":1.0,"fga_per_100":21.2,"three_pa_per_100":9.5,"three_point_pct":0.372,"two_point_pct":0.492,"free_throw_pct":0.825,"offensive_rebounds_per_100":1.5,"defensive_rebounds_per_100":6.5,"assists_per_100":5.8,"steals_per_100":1.8,"blocks_per_100":0.7,"turnovers_per_100":2.8,"personal_fouls_per_100":2.5},
                {"number":"3","name":"Tyrin Lawrence","position":"G","height":76,"weight":185,"class":"JR","minutes_per_game":28.0,"ppg":13.8,"rpg":3.5,"apg":3.8,"bpg":0.2,"spg":0.9,"fga_per_100":19.5,"three_pa_per_100":10.2,"three_point_pct":0.365,"two_point_pct":0.478,"free_throw_pct":0.812,"offensive_rebounds_per_100":1.2,"defensive_rebounds_per_100":5.0,"assists_per_100":7.0,"steals_per_100":1.6,"blocks_per_100":0.4,"turnovers_per_100":3.2,"personal_fouls_per_100":2.2},
                {"number":"5","name":"Devin McGlockton","position":"C","height":85,"weight":255,"class":"SR","minutes_per_game":25.0,"ppg":11.2,"rpg":8.2,"apg":0.8,"bpg":2.5,"spg":0.5,"fga_per_100":15.5,"three_pa_per_100":0.5,"three_point_pct":0.285,"two_point_pct":0.565,"free_throw_pct":0.672,"offensive_rebounds_per_100":4.5,"defensive_rebounds_per_100":11.5,"assists_per_100":1.5,"steals_per_100":0.9,"blocks_per_100":4.8,"turnovers_per_100":2.0,"personal_fouls_per_100":4.0},
                {"number":"2","name":"Ven-Allen Lubin","position":"F","height":81,"weight":215,"class":"SO","minutes_per_game":24.0,"ppg":10.5,"rpg":6.8,"apg":1.5,"bpg":1.0,"spg":0.7,"fga_per_100":15.8,"three_pa_per_100":4.5,"three_point_pct":0.342,"two_point_pct":0.518,"free_throw_pct":0.728,"offensive_rebounds_per_100":3.0,"defensive_rebounds_per_100":9.2,"assists_per_100":2.8,"steals_per_100":1.2,"blocks_per_100":2.0,"turnovers_per_100":2.2,"personal_fouls_per_100":3.2},
                {"number":"4","name":"Colin Smith","position":"C","height":83,"weight":235,"class":"JR","minutes_per_game":22.0,"ppg":9.5,"rpg":7.5,"apg":0.8,"bpg":1.8,"spg":0.4,"fga_per_100":14.8,"three_pa_per_100":1.0,"three_point_pct":0.295,"two_point_pct":0.555,"free_throw_pct":0.685,"offensive_rebounds_per_100":3.8,"defensive_rebounds_per_100":10.5,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":3.5,"turnovers_per_100":2.0,"personal_fouls_per_100":3.8},
                {"number":"11","name":"Ezra Manjon","position":"G","height":74,"weight":178,"class":"SR","minutes_per_game":22.0,"ppg":9.2,"rpg":2.5,"apg":4.2,"bpg":0.1,"spg":0.8,"fga_per_100":15.5,"three_pa_per_100":9.8,"three_point_pct":0.378,"two_point_pct":0.455,"free_throw_pct":0.835,"offensive_rebounds_per_100":0.7,"defensive_rebounds_per_100":3.5,"assists_per_100":7.8,"steals_per_100":1.4,"blocks_per_100":0.2,"turnovers_per_100":3.2,"personal_fouls_per_100":2.0},
                {"number":"14","name":"Trey Thomas","position":"G","height":75,"weight":182,"class":"SR","minutes_per_game":18.0,"ppg":7.8,"rpg":2.8,"apg":2.2,"bpg":0.2,"spg":0.6,"fga_per_100":14.5,"three_pa_per_100":8.8,"three_point_pct":0.362,"two_point_pct":0.452,"free_throw_pct":0.808,"offensive_rebounds_per_100":0.8,"defensive_rebounds_per_100":4.0,"assists_per_100":4.0,"steals_per_100":1.0,"blocks_per_100":0.4,"turnovers_per_100":2.5,"personal_fouls_per_100":2.2},
                {"number":"21","name":"Quentin Millora-Brown","position":"F","height":82,"weight":218,"class":"SR","minutes_per_game":16.0,"ppg":6.2,"rpg":5.2,"apg":0.8,"bpg":0.8,"spg":0.4,"fga_per_100":12.8,"three_pa_per_100":3.5,"three_point_pct":0.335,"two_point_pct":0.508,"free_throw_pct":0.712,"offensive_rebounds_per_100":2.5,"defensive_rebounds_per_100":7.5,"assists_per_100":1.5,"steals_per_100":0.7,"blocks_per_100":1.5,"turnovers_per_100":2.0,"personal_fouls_per_100":3.2},
                {"number":"10","name":"Paul Lewis","position":"G","height":73,"weight":172,"class":"FR","minutes_per_game":13.0,"ppg":4.8,"rpg":1.8,"apg":1.8,"bpg":0.1,"spg":0.4,"fga_per_100":11.8,"three_pa_per_100":7.5,"three_point_pct":0.345,"two_point_pct":0.442,"free_throw_pct":0.778,"offensive_rebounds_per_100":0.5,"defensive_rebounds_per_100":2.5,"assists_per_100":3.2,"steals_per_100":0.7,"blocks_per_100":0.2,"turnovers_per_100":2.5,"personal_fouls_per_100":2.0}
            ]
        }
    ]
}

big12 = {
    "conference": "Big 12",
    "teams": [
        {"name":"Arizona",        "nickname":"Wildcats",     "primaryColor":"#CC0033","record":"","logo":"","head_coach":"Tommy Lloyd",      "city":"Tucson",         "possessions_per_game":76.5,"offensive_rebound_pct":0.30,"defensive_rebound_pct":0.70,"assist_rate":0.56,"team_fouls_per_game":17,"home_fg_bonus":0.02,"players":[]},
        {"name":"Arizona State",  "nickname":"Sun Devils",   "primaryColor":"#8C1D40","record":"","logo":"","head_coach":"Bobby Hurley",      "city":"Tempe",          "possessions_per_game":74.0,"offensive_rebound_pct":0.29,"defensive_rebound_pct":0.71,"assist_rate":0.53,"team_fouls_per_game":18,"home_fg_bonus":0.02,"players":[]},
        {"name":"Baylor",         "nickname":"Bears",        "primaryColor":"#154734","record":"","logo":"","head_coach":"Scott Drew",        "city":"Waco",           "possessions_per_game":73.0,"offensive_rebound_pct":0.30,"defensive_rebound_pct":0.70,"assist_rate":0.55,"team_fouls_per_game":17,"home_fg_bonus":0.02,"players":[]},
        {"name":"BYU",            "nickname":"Cougars",      "primaryColor":"#002E5D","record":"","logo":"","head_coach":"Kevin Young",        "city":"Provo",          "possessions_per_game":72.0,"offensive_rebound_pct":0.28,"defensive_rebound_pct":0.72,"assist_rate":0.54,"team_fouls_per_game":16,"home_fg_bonus":0.02,"players":[]},
        {"name":"Cincinnati",     "nickname":"Bearcats",     "primaryColor":"#E00122","record":"","logo":"","head_coach":"Wes Miller",         "city":"Cincinnati",     "possessions_per_game":71.0,"offensive_rebound_pct":0.29,"defensive_rebound_pct":0.71,"assist_rate":0.52,"team_fouls_per_game":18,"home_fg_bonus":0.02,"players":[]},
        {"name":"Colorado",       "nickname":"Buffaloes",    "primaryColor":"#CFB87C","record":"","logo":"","head_coach":"Tad Boyle",          "city":"Boulder",        "possessions_per_game":70.5,"offensive_rebound_pct":0.28,"defensive_rebound_pct":0.72,"assist_rate":0.53,"team_fouls_per_game":17,"home_fg_bonus":0.02,"players":[]},
        {"name":"Houston",        "nickname":"Cougars",      "primaryColor":"#C8102E","record":"","logo":"","head_coach":"Kelvin Sampson",     "city":"Houston",        "possessions_per_game":68.5,"offensive_rebound_pct":0.28,"defensive_rebound_pct":0.72,"assist_rate":0.51,"team_fouls_per_game":15,"home_fg_bonus":0.02,"players":[]},
        {"name":"Iowa State",     "nickname":"Cyclones",     "primaryColor":"#C8102E","record":"","logo":"","head_coach":"T.J. Otzelberger",   "city":"Ames",           "possessions_per_game":72.5,"offensive_rebound_pct":0.29,"defensive_rebound_pct":0.71,"assist_rate":0.55,"team_fouls_per_game":16,"home_fg_bonus":0.02,"players":[]},
        {"name":"Kansas",         "nickname":"Jayhawks",     "primaryColor":"#0051A5","record":"","logo":"","head_coach":"Bill Self",           "city":"Lawrence",       "possessions_per_game":73.0,"offensive_rebound_pct":0.30,"defensive_rebound_pct":0.70,"assist_rate":0.54,"team_fouls_per_game":17,"home_fg_bonus":0.02,"players":[]},
        {"name":"Kansas State",   "nickname":"Wildcats",     "primaryColor":"#512888","record":"","logo":"","head_coach":"Jerome Tang",        "city":"Manhattan",      "possessions_per_game":71.5,"offensive_rebound_pct":0.29,"defensive_rebound_pct":0.71,"assist_rate":0.53,"team_fouls_per_game":17,"home_fg_bonus":0.02,"players":[]},
        {"name":"Oklahoma State", "nickname":"Cowboys",      "primaryColor":"#FF6600","record":"","logo":"","head_coach":"Donnie Tyndall",     "city":"Stillwater",     "possessions_per_game":72.0,"offensive_rebound_pct":0.30,"defensive_rebound_pct":0.70,"assist_rate":0.52,"team_fouls_per_game":18,"home_fg_bonus":0.02,"players":[]},
        {"name":"TCU",            "nickname":"Horned Frogs", "primaryColor":"#4D1979","record":"","logo":"","head_coach":"Jamie Dixon",        "city":"Fort Worth",     "possessions_per_game":70.0,"offensive_rebound_pct":0.28,"defensive_rebound_pct":0.72,"assist_rate":0.53,"team_fouls_per_game":17,"home_fg_bonus":0.02,"players":[]},
        {"name":"Texas Tech",     "nickname":"Red Raiders",  "primaryColor":"#CC0000","record":"","logo":"","head_coach":"Grant McCasland",    "city":"Lubbock",        "possessions_per_game":71.0,"offensive_rebound_pct":0.29,"defensive_rebound_pct":0.71,"assist_rate":0.52,"team_fouls_per_game":17,"home_fg_bonus":0.02,"players":[]},
        {"name":"UCF",            "nickname":"Knights",      "primaryColor":"#BA9B37","record":"","logo":"","head_coach":"Johnny Dawkins",     "city":"Orlando",        "possessions_per_game":73.0,"offensive_rebound_pct":0.30,"defensive_rebound_pct":0.70,"assist_rate":0.54,"team_fouls_per_game":18,"home_fg_bonus":0.02,"players":[]},
        {"name":"Utah",           "nickname":"Utes",         "primaryColor":"#CC0000","record":"","logo":"","head_coach":"Danny Sprinkle",     "city":"Salt Lake City", "possessions_per_game":70.5,"offensive_rebound_pct":0.28,"defensive_rebound_pct":0.72,"assist_rate":0.53,"team_fouls_per_game":16,"home_fg_bonus":0.02,"players":[]},
        {"name":"West Virginia",  "nickname":"Mountaineers", "primaryColor":"#002776","record":"","logo":"","head_coach":"Darian DeVries",     "city":"Morgantown",     "possessions_per_game":71.5,"offensive_rebound_pct":0.29,"defensive_rebound_pct":0.71,"assist_rate":0.52,"team_fouls_per_game":18,"home_fg_bonus":0.02,"players":[]}
    ]
}

# ── Append to data.json ───────────────────────────────────────────────────────
data_path = r"C:\Users\oneil\Desktop\college-hoops-throwdown\data.json"

with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Remove any existing SEC / Big 12 entries so we don't duplicate
data = [c for c in data if c.get("conference") not in ("SEC", "Big 12")]
data.append(sec)
data.append(big12)

with open(data_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4)

print(f"Done. data.json now has {len(data)} conferences.")
for c in data:
    print(f"  {c['conference']}: {len(c['teams'])} teams")
