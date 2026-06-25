using System;
using Microsoft.Data.Sqlite;

class Program {
    static void Main() {
        string dbPath = "TenantRating.API/tenantrating_v2.db";
        using var connection = new SqliteConnection($"Data Source={dbPath}");
        connection.Open();
        var command = connection.CreateCommand();
        command.CommandText = "SELECT Email, Role, FirstName, LastName FROM Users";
        using var reader = command.ExecuteReader();
        while (reader.Read()) {
            Console.WriteLine($"{reader.GetString(0)} - Role: {reader.GetInt32(1)} - {reader.GetString(2)} {reader.GetString(3)}");
        }
    }
}
