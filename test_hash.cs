using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;

class Program {
    static void Main() {
        string dbPath = "TenantRating.API/tenantrating_v2.db";
        using var connection = new SqliteConnection($"Data Source={dbPath}");
        connection.Open();
        var command = connection.CreateCommand();
        command.CommandText = "SELECT Email, PasswordHash, PasswordSalt FROM Users WHERE Email = 'test2@test.com'";
        using var reader = command.ExecuteReader();
        if (reader.Read()) {
            string email = reader.GetString(0);
            byte[] storedHash = (byte[])reader.GetValue(1);
            byte[] storedSalt = (byte[])reader.GetValue(2);
            
            using var hmac = new HMACSHA512(storedSalt);
            var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes("123456"));
            
            bool match = true;
            for (int i = 0; i < computedHash.Length; i++) {
                if (computedHash[i] != storedHash[i]) { match = false; break; }
            }
            Console.WriteLine("Match for test2@test.com with 123456: " + match);
        } else {
            Console.WriteLine("User not found.");
        }
    }
}
