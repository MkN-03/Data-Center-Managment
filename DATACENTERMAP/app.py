from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from models import db, Server, User
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your_super_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///servers.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

@app.route('/')
def root():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password'].strip()
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            return redirect(url_for('dashboard'))
        flash('Invalid credentials')
    return render_template('login.html', year=datetime.now().year)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/help/login')
def help_login():
    return render_template('help_login.html')

@app.route('/help/register')
def help_register():
    return render_template('help_register.html')

@app.route('/help/dashboard')
def help_dashboard():
    return render_template('help_dashboard.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html', year=datetime.now().year)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password'].strip()
        if not username or not password:
            flash('Username and password are required')
            return render_template('register.html')
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return render_template('register.html')
        new_user = User(username=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful. Please log in.')
        return redirect(url_for('login'))
    return render_template('register.html', year=datetime.now().year)




@app.route('/api/data')
def get_data():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    servers = Server.query.all()
    return jsonify([{
        'name': s.name, 'ip': s.ip, 'status': s.status,
        'cpu': s.cpu, 'ram': s.ram, 'rack': s.rack,
        'row': s.row, 'last_maintenance': s.last_maintenance
    } for s in servers])

@app.route('/api/add', methods=['POST'])
def add_server():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json
    if Server.query.filter_by(ip=data['ip']).first():
        return jsonify({'error': 'IP already exists'}), 400
    try:
        new_server = Server(
            name=data['name'], ip=data['ip'], status=data['status'],
            cpu=data['cpu'], ram=data['ram'], rack=int(data['rack']),
            row=data['row'], last_maintenance=data['last_maintenance']
        )
        db.session.add(new_server)
        db.session.commit()
        return jsonify({'message': 'Server added'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/update', methods=['POST'])
def update_server():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json
    srv = Server.query.filter_by(ip=data['ip']).first()
    if not srv:
        return jsonify({'error': 'Not found'}), 404
    for key in ['name', 'status', 'cpu', 'ram', 'rack', 'row', 'last_maintenance']:
        setattr(srv, key, data[key])
    db.session.commit()
    return jsonify({'message': 'Updated'})

@app.route('/api/delete', methods=['POST'])
def delete_server():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    ip = request.json.get('ip')
    srv = Server.query.filter_by(ip=ip).first()
    if srv:
        db.session.delete(srv)
        db.session.commit()
    return jsonify({'message': 'Deleted'})

@app.route('/api/delete_rack', methods=['POST'])
def delete_rack():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        rack_id = int(request.json.get('rack'))
    except:
        return jsonify({'error': 'Invalid rack'}), 400
    Server.query.filter_by(rack=rack_id).delete()
    db.session.commit()
    return jsonify({'message': f'Rack {rack_id} deleted'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("✅ Default admin created (username=admin, password=admin123)")
    app.run(debug=True, host='0.0.0.0', port=5001)
