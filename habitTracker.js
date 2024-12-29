class HabitTracker {
    constructor() {
        this.state = {
            month: '',
            dailyHabits: [],
            weeklyHabits: [],
            monthlyHabits: [],
            dailyProgress: {}, // Format: {habitIndex: [day1, day2, ...]}
            weeklyProgress: {}, // Format: {habitIndex: [week1, week2, ...]}
            monthlyProgress: {} // Format: {habitIndex: boolean}
        };
        
        this.daysInMonth = 31; // Default value
        this.habitColors = [
            '#007bff', // blue
            '#28a745', // green
            '#dc3545', // red
            '#ffc107', // yellow
            '#17a2b8', // cyan
            '#6f42c1', // purple
            '#fd7e14', // orange
        ];
        
        this.init();
        this.loadFromLocalStorage();
    }

    init() {
        // Initialize month input
        const monthInput = document.getElementById('monthInput');
        monthInput.addEventListener('change', (e) => {
            this.state.month = e.target.value;
            // Update days in month when month changes
            const [year, month] = e.target.value.split('-');
            this.daysInMonth = new Date(year, month, 0).getDate();
            this.drawWheel();
            this.updateSummary();
            this.saveToLocalStorage();
        });

        // Initialize habit input handlers
        this.initializeHabitInputs();
        
        // Initialize wheel
        this.drawWheel();

        // Initialize import/export
        this.initializeImportExport();

        // Initialize summary
        this.updateSummary();
    }

    initializeHabitInputs() {
        // Add habit button handlers
        document.querySelectorAll('.add-habit').forEach(button => {
            button.addEventListener('click', (e) => {
                const container = e.target.closest('.habit-input').parentElement;
                const input = container.querySelector('input');
                // Determine habit type based on parent container
                const habitType = container.closest('.daily-habits') ? 'daily' :
                                container.closest('.weekly-habits') ? 'weekly' : 'monthly';
                
                if (input.value.trim()) {
                    this.addHabit(habitType, input.value.trim());
                    input.value = '';
                }
            });
        });
    }

    addHabit(type, name) {
        const habitList = `${type}Habits`;
        this.state[habitList].push(name);
        this.renderHabits();
        this.saveToLocalStorage();
    }

    drawWheel() {
        const svg = document.getElementById('habitWheel');
        svg.innerHTML = '';
        
        // Calculate dimensions
        const centerX = 300;
        const centerY = 250;
        const radius = 160;
        const startAngleOffset = 0;  // Start from top (-90 degrees)
        const endAngleOffset = 270;    // End at bottom-left (180 degrees)
        
        // Create a group for each habit
        this.state.dailyHabits.forEach((habit, habitIndex) => {
            const habitGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            habitGroup.setAttribute('class', 'habit-ring');
            habitGroup.setAttribute('data-habit', habitIndex);
            
            // Calculate radius for this habit ring
            const habitRadius = radius - (habitIndex * 30);
            
            // Get habit color
            const habitColor = this.habitColors[habitIndex % this.habitColors.length];
            
            // Draw segments for each day
            for (let day = 1; day <= this.daysInMonth; day++) {
                const angleRange = endAngleOffset - startAngleOffset;
                const startAngle = startAngleOffset + ((day - 1) * (angleRange / this.daysInMonth));
                const endAngle = startAngleOffset + (day * (angleRange / this.daysInMonth));
                
                // Calculate path coordinates
                const path = this.describeArc(centerX, centerY, habitRadius, startAngle, endAngle);
                
                // Create segment
                const segment = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                segment.setAttribute('d', path);
                segment.setAttribute('class', 'wheel-segment');
                segment.setAttribute('data-day', day);
                
                segment.style.fill = this.state.dailyProgress[habitIndex]?.includes(day) 
                    ? habitColor 
                    : '#f0f0f0';
                segment.style.stroke = habitColor;
                
                if (this.state.dailyProgress[habitIndex]?.includes(day)) {
                    segment.classList.add('completed');
                }
                
                segment.addEventListener('click', () => this.toggleDailyHabit(habitIndex, day));
                habitGroup.appendChild(segment);
            }
            
            // Add habit label in the second quadrant (top-left)
            const labelX = 100;
            const labelY = 100 + (habitIndex * 30);
            
            // Add colored line connecting label to habit ring
            const connectingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            connectingLine.setAttribute('x1', labelX);
            connectingLine.setAttribute('y1', labelY+5);
            connectingLine.setAttribute('x2', centerX);
            connectingLine.setAttribute('y2', labelY+5);
            connectingLine.setAttribute('stroke', habitColor);
            connectingLine.setAttribute('stroke-width', '1.5');
            connectingLine.setAttribute('class', 'connecting-line');
            habitGroup.appendChild(connectingLine);
            
            const habitLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            habitLabel.setAttribute('x', labelX);
            habitLabel.setAttribute('y', labelY);
            habitLabel.setAttribute('class', 'habit-wheel-label');
            habitLabel.setAttribute('text-anchor', 'start');
            habitLabel.style.fill = habitColor;
            habitLabel.textContent = habit;
            
            habitGroup.appendChild(habitLabel);
            
            svg.appendChild(habitGroup);
        });
        
        // Add date numbers around the wheel
        for (let day = 1; day <= this.daysInMonth; day++) {
            const angleRange = endAngleOffset - startAngleOffset;
            const angle = startAngleOffset + ((day - 1) * (angleRange / this.daysInMonth));
            const dateRadius = radius + 15;
            const position = this.polarToCartesian(centerX, centerY, dateRadius, angle);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', position.x);
            text.setAttribute('y', position.y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('alignment-baseline', 'middle');
            text.setAttribute('class', 'date-label');
            text.textContent = day;
            
            svg.appendChild(text);
        }
    }

    describeArc(x, y, radius, startAngle, endAngle) {
        const start = this.polarToCartesian(x, y, radius, endAngle);
        const end = this.polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        
        return [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            "L", x, y,
            "Z"
        ].join(" ");
    }

    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    saveToLocalStorage() {
        localStorage.setItem('habitTrackerState', JSON.stringify(this.state));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('habitTrackerState');
        if (saved) {
            this.state = JSON.parse(saved);
            this.renderHabits();
            if (this.state.month) {
                document.getElementById('monthInput').value = this.state.month;
            }
        }
    }

    exportToCsv() {
        // Implementation for CSV export
        const csv = this.convertStateToCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `habit-tracker-${this.state.month || 'export'}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    convertStateToCSV() {
        // Implementation for state to CSV conversion
        // This is a basic implementation - you might want to enhance it
        return JSON.stringify(this.state);
    }

    importFromCsv(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.state = JSON.parse(e.target.result);
                this.saveToLocalStorage();
                this.renderHabits();
                if (this.state.month) {
                    document.getElementById('monthInput').value = this.state.month;
                }
            } catch (error) {
                console.error('Error importing file:', error);
                alert('Invalid file format');
            }
        };
        reader.readAsText(file);
    }

    initializeImportExport() {
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCsv());
        
        const importBtn = document.getElementById('importBtn');
        const importInput = document.getElementById('importInput');
        
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importFromCsv(e.target.files[0]);
            }
        });
    }

    renderHabits() {
        // Render daily habits
        this.renderHabitList('daily');
        
        // Render weekly habits
        this.renderHabitList('weekly');
        
        // Render monthly habits
        this.renderHabitList('monthly');

        // Update summary
        this.updateSummary();
    }

    renderHabitList(type) {
        // Skip rendering for daily habits as they're handled in the summary
        if (type === 'daily') {
            this.drawWheel();
            return;
        }
        
        const container = document.getElementById(`${type}HabitsContainer`);
        const habitList = this.state[`${type}Habits`];
        const progress = this.state[`${type}Progress`];
        
        // Clear existing habits (except the input)
        const inputDiv = container.querySelector('.habit-input');
        container.innerHTML = '';
        container.appendChild(inputDiv);
        
        // Add each habit
        habitList.forEach((habit, index) => {
            const habitDiv = document.createElement('div');
            habitDiv.className = 'habit-item';
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-habit';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', () => this.deleteHabit(type, index));
            
            if (type === 'weekly') {
                // Create a span for the habit name and a container for week boxes
                habitDiv.innerHTML = `
                    <label class="habit-checkbox">
                        <span>${habit}</span>
                    </label>
                    <div class="week-boxes">
                        ${Array(5).fill(0).map((_, i) => `
                            <div class="week-box ${progress[index]?.includes(i) ? 'checked' : ''}"
                                 data-habit="${index}" data-week="${i}">
                                <span class="week-number">W${i + 1}</span>
                            </div>
                        `).join('')}
                    </div>`;
                habitDiv.appendChild(deleteBtn);
                
                // Add click handlers for week boxes
                habitDiv.querySelectorAll('.week-box').forEach(box => {
                    box.addEventListener('click', () => this.toggleWeeklyHabit(box));
                });
            } else {
                // For monthly habits, create a single checkbox
                habitDiv.innerHTML = `
                    <label class="habit-checkbox">
                        <input type="checkbox" data-habit="${index}"
                               ${progress[index] ? 'checked' : ''}>
                        <span>${habit}</span>
                    </label>`;
                habitDiv.appendChild(deleteBtn);
            }
            
            container.appendChild(habitDiv);
        });
        
        // Add event listeners for monthly checkboxes
        if (type === 'monthly') {
            container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', () => this.toggleMonthlyHabit(checkbox));
            });
        }
    }

    addHabitToWheel(habit, habitIndex) {
        // Redraw the entire wheel when a new habit is added
        this.drawWheel();
        
        // Add the habit name to the list
        // const habitDiv = document.createElement('div');
        // habitDiv.className = 'habit-item';
        // habitDiv.innerHTML = `<span>${habit}</span>`;
        
        // const container = document.getElementById('dailyHabitsContainer');
        // container.insertBefore(habitDiv, container.querySelector('.habit-input'));
    }

    toggleWeeklyHabit(box) {
        const habitIndex = parseInt(box.dataset.habit);
        const weekIndex = parseInt(box.dataset.week);
        
        if (!this.state.weeklyProgress[habitIndex]) {
            this.state.weeklyProgress[habitIndex] = [];
        }
        
        const progress = this.state.weeklyProgress[habitIndex];
        const weekPos = progress.indexOf(weekIndex);
        
        if (weekPos === -1) {
            progress.push(weekIndex);
        } else {
            progress.splice(weekPos, 1);
        }
        
        box.classList.toggle('checked');
        this.updateSummary();
        this.saveToLocalStorage();
    }

    toggleMonthlyHabit(checkbox) {
        const habitIndex = parseInt(checkbox.dataset.habit);
        this.state.monthlyProgress[habitIndex] = checkbox.checked;
        this.updateSummary();
        this.saveToLocalStorage();
    }

    toggleDailyHabit(habitIndex, day) {
        if (!this.state.dailyProgress[habitIndex]) {
            this.state.dailyProgress[habitIndex] = [];
        }
        
        const progress = this.state.dailyProgress[habitIndex];
        const dayIndex = progress.indexOf(day);
        
        if (dayIndex === -1) {
            progress.push(day);
        } else {
            progress.splice(dayIndex, 1);
        }
        
        // Update the wheel
        this.drawWheel();
        this.updateSummary();
        this.saveToLocalStorage();
    }

    deleteHabit(type, index) {
        // Remove the habit from the habits array
        this.state[`${type}Habits`].splice(index, 1);
        
        // Remove the corresponding progress data
        if (this.state[`${type}Progress`][index]) {
            delete this.state[`${type}Progress`][index];
        }
        
        // Reindex the remaining progress data
        const newProgress = {};
        Object.keys(this.state[`${type}Progress`])
            .filter(i => i > index)
            .forEach(i => {
                newProgress[i - 1] = this.state[`${type}Progress`][i];
            });
        this.state[`${type}Progress`] = newProgress;
        
        // Save and re-render
        this.saveToLocalStorage();
        this.renderHabits();
    }

    updateSummary() {
        const summaryContainer = document.getElementById('summaryContainer');
        summaryContainer.innerHTML = '';

        // Daily habits summary only
        this.state.dailyHabits.forEach((habit, index) => {
            const progress = this.state.dailyProgress[index] || [];
            const percentage = (progress.length / this.daysInMonth) * 100;
            this.addSummaryItem(
                habit, 
                percentage, 
                this.habitColors[index % this.habitColors.length],
                `${progress.length}/${this.daysInMonth}`,
                'daily',
                index
            );
        });
    }

    addSummaryItem(habit, percentage, color, count, type, index) {
        const summaryContainer = document.getElementById('summaryContainer');
        const roundedPercentage = Math.round(percentage);
        
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-item';
        
        // Add delete button for daily habits
        const deleteButton = type === 'daily' ? 
            `<button class="delete-habit" data-index="${index}">×</button>` : '';
        
        summaryItem.innerHTML = `
            <span class="summary-label">${habit}</span>
            <div class="summary-progress">
                <div class="progress-bar">
                    <div class="progress-fill" 
                         style="width: ${roundedPercentage}%; background-color: ${color}">
                    </div>
                </div>
                <span class="progress-text">${count} (${roundedPercentage}%)</span>
                ${deleteButton}
            </div>
        `;
        
        // Add click handler for delete button if it's a daily habit
        if (type === 'daily') {
            summaryItem.querySelector('.delete-habit').addEventListener('click', () => {
                this.deleteHabit('daily', index);
            });
        }
        
        summaryContainer.appendChild(summaryItem);
    }
}

// Initialize the application
const habitTracker = new HabitTracker(); 