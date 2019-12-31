let machStack = [];

class Machine{
	constructor(machFields){
		this.machFields = machFields;
		this.curState = machFields.initialState;
	}

    toAction(event, action) {
 		if (typeof action === 'string') {
            this.toAction(event, this.machFields.actions[action]);
        } else if (typeof action === 'function') {
            machStack.push({machine: this, event: event});
            action(event);
            machStack.pop();
		} else if (Array.isArray(action)) {
            for (let i = 0; i < action.length; i++) {
                this.toAction(event, action[i]);
            }
        }
    }

	transition(transaction, event) {
		const transition = this.machFields.states[this.curState].on[transaction];
        this.toAction(event, transition.service || (() => {
            const [machCurSt, setState] = useState();
            setState(transition.target);
        }));
	}
}

const machine = function(machFields) {
	return new Machine(machFields);
};

function useState() {
    const {machine, event} = {...machStack[machStack.length - 1]};
    if (!machine) {
        throw new Error("useState() should be run from state machine");
    }
    const setState = function (newState) {
		const onExit = machine.machFields.states[machine.curState].onExit;
        machine.toAction(event, onExit);
        machine.curState = newState;
        const onEntry = machine.machFields.states[machine.curState].onEntry;
        machine.toAction(event, onEntry);
    };
    return [machine.curState, setState];
}

function useContext() {
    const {machine, event} = {...machStack[machStack.length - 1]};
    if (!machine) {
        throw new Error("useContext() should be run from state machine");
    }
    const setContext = function (newContext) {
        machine.machFields.context = {...machine.machFields.context, ...newContext};
    };
    return [machine.machFields.context, setContext];
}

// machine — создает инстанс state machine (фабрика)
const vacancyMachine = machine({
  	// У каждого может быть свой id
	id: 'vacancy',
  	// начальное состояние
	initialState: 'notResponded',
  	// дополнительный контекст (payload)
	context: {id: 123},
  	// Граф состояний и переходов между ними
	states: {
    	// Каждое поле — это возможное состоение
		responded: {
      	// action, который нужно выполнить при входе в это состояние. Можно задавать массивом, строкой или функцией
			onEntry: 'onStateEntry'
		},
		notResponded: {
      		// action, который нужно выполнить при выходе из этого состояния. Можно задавать массивом, строкой или функцией                         
			onExit() {
				console.log('we are leaving notResponded state');
			},
      		// Блок описания транзакций
			on: {
        	// Транзакция
				RESPOND: {
          		// упрощенный сервис, вызываем при транзакции
				service: (event) => {
            		// Позволяет получить текущий контекст и изменить его
				  	const [contex, setContext] = useContext();			
            		// Позволяет получить текущий стейт и изменить его
            		const [state, setState] = useState();
            		// // Поддерживаются асинхронные действия
					// window.fetch({method: 'post', data: {resume: event.resume, vacancyId: context.id} })
					// .then(() => {
              		// // меняем состояние
					// 	setState('responded');
              		// // Мержим контекст
					// 	setContext({completed: true}); // {id: 123, comleted: true}
					//   });

					// меняем состояние
					setState('responded');
					// Мержим контекст
  					setContext({completed: true}); // {id: 123, comleted: true}
				  },
          		// Если не задан сервис, то просто переводим в заданный target, иначе выполняем сервис.
				target: 'responded',
				}
			}
		},		
	},
  	// Раздел описание экшенов 
	actions: {
		onStateEntry: (event) => {
			const [state] = useState();
			console.log('now state is ' + state);
		},
		makeResponse: (event) => {
			// both sync and async actions
			const [context, setContext] = useContext();			
			window.fetch({method: 'post', data: {resume: event.resume, vacancyId: context.id} });
		}
	}
});

// Пример использования StateMachine
vacancyMachine.transition('RESPOND', {resume: {name: 'Vasya', lastName: 'Pupkin'}});