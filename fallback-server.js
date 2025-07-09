const express = require("express")
const cors = require("cors")
const path = require("path")
const fs = require("fs")

// HTML inline como fallback
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Tickets - Discord Bot</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div id="app" class="min-h-screen">
        <div id="loading" class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="text-gray-600">Carregando dashboard...</p>
            </div>
        </div>
        
        <div id="content" class="hidden">
            <div class="container mx-auto p-6">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">
                        <i class="fas fa-ticket-alt text-blue-500 mr-3"></i>
                        Dashboard de Tickets
                    </h1>
                    <p class="text-gray-600">Sistema funcionando! Dashboard carregado via fallback.</p>
                </div>
                
                <div id="stats-cards" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"></div>
                <div id="tickets-container"></div>
                
                <div id="empty-state" class="bg-white rounded-lg shadow-md p-12 text-center">
                    <i class="fas fa-ticket-alt text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold mb-2">Dashboard Online!</h3>
                    <p class="text-gray-600">O sistema está funcionando. Tickets aparecerão aqui quando criados.</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // JavaScript básico para testar
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden')
            document.getElementById('content').classList.remove('hidden')
        }, 1000)
        
        // Tentar carregar dados
        fetch('/api/tickets')
            .then(r => r.json())
            .then(data => {
                console.log('Tickets:', data)
                document.getElementById('stats-cards').innerHTML = 
                    '<div class="bg-white p-6 rounded-lg shadow"><h3>Total: ' + (Array.isArray(data) ? data.length : 0) + '</h3></div>'
            })
            .catch(e => console.log('API ainda não disponível:', e))
    </script>
</body>
</html>`

module.exports = { DASHBOARD_HTML }
