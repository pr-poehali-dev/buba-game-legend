'''
Business: Управление маркетплейсом Буб - выставление на продажу, покупка и просмотр лотов
Args: event с httpMethod, body, queryStringParameters; context с request_id
Returns: HTTP response с данными маркетплейса или результатом операции
'''

import json
import os
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise Exception('DATABASE_URL not found')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Player-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    conn = get_db_connection()
    
    try:
        if method == 'GET':
            action = event.get('queryStringParameters', {}).get('action', 'listings')
            
            if action == 'listings':
                with conn.cursor() as cur:
                    cur.execute('''
                        SELECT 
                            listing_id,
                            seller_id,
                            booba_id,
                            price,
                            created_at
                        FROM t_p9427345_buba_game_legend.marketplace
                        ORDER BY created_at DESC
                    ''')
                    listings = cur.fetchall()
                    
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'listings': listings}, default=str)
                }
            
            elif action == 'inventory':
                player_id = event.get('queryStringParameters', {}).get('player_id')
                if not player_id:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'player_id required'})
                    }
                
                with conn.cursor() as cur:
                    cur.execute('''
                        SELECT booba_id, count 
                        FROM t_p9427345_buba_game_legend.inventory
                        WHERE player_id = %s
                    ''', (player_id,))
                    inventory = cur.fetchall()
                    
                    cur.execute('''
                        SELECT bubix FROM t_p9427345_buba_game_legend.players
                        WHERE player_id = %s
                    ''', (player_id,))
                    player = cur.fetchone()
                    bubix = player['bubix'] if player else 0
                    
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'inventory': inventory, 'bubix': bubix}, default=str)
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            player_id = body_data.get('player_id')
            
            if not player_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'player_id required'})
                }
            
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO t_p9427345_buba_game_legend.players (player_id, bubix)
                    VALUES (%s, 200)
                    ON CONFLICT (player_id) DO NOTHING
                ''', (player_id,))
                conn.commit()
            
            if action == 'sell':
                booba_id = body_data.get('booba_id')
                price = body_data.get('price')
                
                if not booba_id or not price:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'booba_id and price required'})
                    }
                
                with conn.cursor() as cur:
                    cur.execute('''
                        SELECT count FROM t_p9427345_buba_game_legend.inventory
                        WHERE player_id = %s AND booba_id = %s
                    ''', (player_id, booba_id))
                    result = cur.fetchone()
                    
                    if not result or result['count'] < 1:
                        return {
                            'statusCode': 400,
                            'headers': headers,
                            'body': json.dumps({'error': 'Not enough items'})
                        }
                    
                    if result['count'] == 1:
                        cur.execute('''
                            DELETE FROM t_p9427345_buba_game_legend.inventory
                            WHERE player_id = %s AND booba_id = %s
                        ''', (player_id, booba_id))
                    else:
                        cur.execute('''
                            UPDATE t_p9427345_buba_game_legend.inventory
                            SET count = count - 1
                            WHERE player_id = %s AND booba_id = %s
                        ''', (player_id, booba_id))
                    
                    cur.execute('''
                        INSERT INTO t_p9427345_buba_game_legend.marketplace (seller_id, booba_id, price)
                        VALUES (%s, %s, %s)
                        RETURNING listing_id
                    ''', (player_id, booba_id, price))
                    listing = cur.fetchone()
                    conn.commit()
                    
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True, 'listing_id': listing['listing_id']})
                }
            
            elif action == 'buy':
                listing_id = body_data.get('listing_id')
                
                if not listing_id:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'listing_id required'})
                    }
                
                with conn.cursor() as cur:
                    cur.execute('''
                        SELECT seller_id, booba_id, price
                        FROM t_p9427345_buba_game_legend.marketplace
                        WHERE listing_id = %s
                    ''', (listing_id,))
                    listing = cur.fetchone()
                    
                    if not listing:
                        return {
                            'statusCode': 404,
                            'headers': headers,
                            'body': json.dumps({'error': 'Listing not found'})
                        }
                    
                    if listing['seller_id'] == player_id:
                        return {
                            'statusCode': 400,
                            'headers': headers,
                            'body': json.dumps({'error': 'Cannot buy your own listing'})
                        }
                    
                    cur.execute('''
                        SELECT bubix FROM t_p9427345_buba_game_legend.players
                        WHERE player_id = %s
                    ''', (player_id,))
                    buyer = cur.fetchone()
                    
                    if not buyer or buyer['bubix'] < listing['price']:
                        return {
                            'statusCode': 400,
                            'headers': headers,
                            'body': json.dumps({'error': 'Not enough bubix'})
                        }
                    
                    cur.execute('''
                        UPDATE t_p9427345_buba_game_legend.players
                        SET bubix = bubix - %s
                        WHERE player_id = %s
                    ''', (listing['price'], player_id))
                    
                    cur.execute('''
                        UPDATE t_p9427345_buba_game_legend.players
                        SET bubix = bubix + %s
                        WHERE player_id = %s
                    ''', (listing['price'], listing['seller_id']))
                    
                    cur.execute('''
                        INSERT INTO t_p9427345_buba_game_legend.inventory (player_id, booba_id, count)
                        VALUES (%s, %s, 1)
                        ON CONFLICT (player_id, booba_id)
                        DO UPDATE SET count = t_p9427345_buba_game_legend.inventory.count + 1
                    ''', (player_id, listing['booba_id']))
                    
                    cur.execute('''
                        DELETE FROM t_p9427345_buba_game_legend.marketplace
                        WHERE listing_id = %s
                    ''', (listing_id,))
                    
                    conn.commit()
                    
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True, 'booba_id': listing['booba_id']})
                }
            
            elif action == 'sync':
                inventory_data = body_data.get('inventory', {})
                bubix_value = body_data.get('bubix', 200)
                
                with conn.cursor() as cur:
                    cur.execute('''
                        UPDATE t_p9427345_buba_game_legend.players
                        SET bubix = %s
                        WHERE player_id = %s
                    ''', (bubix_value, player_id))
                    
                    for booba_id, count in inventory_data.items():
                        if count > 0:
                            cur.execute('''
                                INSERT INTO t_p9427345_buba_game_legend.inventory (player_id, booba_id, count)
                                VALUES (%s, %s, %s)
                                ON CONFLICT (player_id, booba_id)
                                DO UPDATE SET count = %s
                            ''', (player_id, booba_id, count, count))
                    
                    conn.commit()
                    
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True})
                }
        
        elif method == 'DELETE':
            body_data = json.loads(event.get('body', '{}'))
            listing_id = body_data.get('listing_id')
            player_id = body_data.get('player_id')
            
            if not listing_id or not player_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'listing_id and player_id required'})
                }
            
            with conn.cursor() as cur:
                cur.execute('''
                    SELECT seller_id, booba_id
                    FROM t_p9427345_buba_game_legend.marketplace
                    WHERE listing_id = %s
                ''', (listing_id,))
                listing = cur.fetchone()
                
                if not listing:
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'error': 'Listing not found'})
                    }
                
                if listing['seller_id'] != player_id:
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'error': 'Not your listing'})
                    }
                
                cur.execute('''
                    DELETE FROM t_p9427345_buba_game_legend.marketplace
                    WHERE listing_id = %s
                ''', (listing_id,))
                
                cur.execute('''
                    INSERT INTO t_p9427345_buba_game_legend.inventory (player_id, booba_id, count)
                    VALUES (%s, %s, 1)
                    ON CONFLICT (player_id, booba_id)
                    DO UPDATE SET count = t_p9427345_buba_game_legend.inventory.count + 1
                ''', (player_id, listing['booba_id']))
                
                conn.commit()
                
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True})
            }
        
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
    finally:
        conn.close()
