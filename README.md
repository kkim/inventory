# inventory
This is a web app. The backend is a simple SQL database with tables. 
Table 1: Houses, columns: Name, address
Table 2: Rooms, columns: Name, house (reference to house table)
Table 3: Furniture, columns: Name, room (reference to room table)
Table 4: Compartment, columns: Name, furniture (reference to furniture table)
Table 5: Item, columns: Name, compartment (reference to compartment table), count
Table 6: User, columns: user ID, user name, password
Table 7: User to House, columns: user ID (reference), House (reference)

Frontend should be sufficient to manipulate the table.
