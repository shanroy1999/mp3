const Task = require('../models/task');
const User = require('../models/user');
const { buildQuery } = require('./utils');

module.exports = function (router)
{
    router
        .route('/tasks')
        .get(async (req, res) =>
        {
            try
            {
                let query = buildQuery(Task, req);
                // default limit 100 for tasks
                if (!req.query.limit)
                {
                    query = query.limit(100);
                }

                if (req.query.count === 'true')
                {
                    const count = await query.countDocuments();
                    return res.status(200).json({ message: 'OK', data: count });
                }

                const tasks = await query.exec();
                return res.status(200).json({ message: 'OK', data: tasks });
            } catch (err)
            {
                return res.status(400).json({ message: err.message, data: [] });
            }
        })
        .post(async (req, res) =>
        {
            try
            {
                const { name, description, deadline, completed, assignedUser, assignedUserName } = req.body;
                if (!name || !deadline)
                {
                    return res.status(400).json({ message: 'Task name and deadline are required', data: [] });
                }

                const task = new Task({
                    name,
                    description: description || '',
                    deadline,
                    completed: completed || false,
                    assignedUser: assignedUser || '',
                    assignedUserName: assignedUserName || 'unassigned',
                });

                const savedTask = await task.save();

                // if assigned to user, push to user's pendingTasks IF task not completed
                if (savedTask.assignedUser && !savedTask.completed)
                {
                    const user = await User.findById(savedTask.assignedUser);
                    if (user)
                    {
                        if (!user.pendingTasks.includes(savedTask._id.toString()))
                        {
                            user.pendingTasks.push(savedTask._id.toString());
                            await user.save();
                        }
                        savedTask.assignedUserName = user.name;
                        await savedTask.save();
                    } else
                    {
                        // user not found, unassign
                        savedTask.assignedUser = '';
                        savedTask.assignedUserName = 'unassigned';
                        await savedTask.save();
                    }
                }

                return res.status(201).json({ message: 'Task created', data: savedTask });
            } catch (err)
            {
                return res.status(500).json({ message: 'Server error creating task', data: err.message });
            }
        });

    router
        .route('/tasks/:id')
        .get(async (req, res) =>
        {
            try
            {
                const select = req.query.select ? JSON.parse(req.query.select) : null;
                const task = await Task.findById(req.params.id, select || undefined);
                if (!task)
                {
                    return res.status(404).json({ message: 'Task not found', data: [] });
                }
                return res.status(200).json({ message: 'OK', data: task });
            } catch (err)
            {
                return res.status(400).json({ message: 'Invalid request', data: [] });
            }
        })
        .put(async (req, res) =>
        {
            try
            {
                const { name, description, deadline, completed, assignedUser, assignedUserName } = req.body;
                if (!name || !deadline)
                {
                    return res.status(400).json({ message: 'Task name and deadline are required', data: [] });
                }

                const task = await Task.findById(req.params.id);
                if (!task)
                {
                    return res.status(404).json({ message: 'Task not found', data: [] });
                }

                // if task currently assigned, clean up old user's pendingTasks
                if (task.assignedUser)
                {
                    const oldUser = await User.findById(task.assignedUser);
                    if (oldUser)
                    {
                        oldUser.pendingTasks = oldUser.pendingTasks.filter((tid) => tid !== task._id.toString());
                        await oldUser.save();
                    }
                }

                // update task
                task.name = name;
                task.description = description || '';
                task.deadline = deadline;
                task.completed = completed || false;
                task.assignedUser = assignedUser || '';
                task.assignedUserName = assignedUserName || 'unassigned';

                const savedTask = await task.save();

                // if re-assigned and not completed, add to new user's pendingTasks
                if (savedTask.assignedUser && !savedTask.completed)
                {
                    const newUser = await User.findById(savedTask.assignedUser);
                    if (newUser)
                    {
                        if (!newUser.pendingTasks.includes(savedTask._id.toString()))
                        {
                            newUser.pendingTasks.push(savedTask._id.toString());
                            await newUser.save();
                        }
                        savedTask.assignedUserName = newUser.name;
                        await savedTask.save();
                    } else
                    {
                        savedTask.assignedUser = '';
                        savedTask.assignedUserName = 'unassigned';
                        await savedTask.save();
                    }
                }

                return res.status(200).json({ message: 'Task updated', data: savedTask });
            } catch (err)
            {
                return res.status(500).json({ message: 'Server error updating task', data: err.message });
            }
        })
        .delete(async (req, res) =>
        {
            try
            {
                const task = await Task.findById(req.params.id);
                if (!task)
                {
                    return res.status(404).json({ message: 'Task not found', data: [] });
                }

                // remove from user's pendingTasks
                if (task.assignedUser)
                {
                    const user = await User.findById(task.assignedUser);
                    if (user)
                    {
                        user.pendingTasks = user.pendingTasks.filter((tid) => tid !== task._id.toString());
                        await user.save();
                    }
                }

                await task.deleteOne();

                return res.status(200).json({ message: 'Task deleted', data: [] });
            } catch (err)
            {
                return res.status(500).json({ message: 'Server error deleting task', data: err.message });
            }
        });

    return router;
};