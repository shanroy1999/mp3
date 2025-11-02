const User = require('../models/user');
const Task = require('../models/task');
const { buildQuery } = require('./utils');

module.exports = function (router)
{
    // /users
    router
        .route('/users')
        .get(async (req, res) =>
        {
            try
            {
                if (req.query.count === 'true')
                {
                    const query = buildQuery(User, req);
                    const count = await query.countDocuments();
                    return res.status(200).json({ message: 'OK', data: count });
                }

                const query = buildQuery(User, req);
                const users = await query.exec();
                return res.status(200).json({ message: 'OK', data: users });
            } catch (err)
            {
                return res.status(400).json({ message: err.message, data: [] });
            }
        })
        .post(async (req, res) =>
        {
            try
            {
                const { name, email, pendingTasks } = req.body;
                if (!name || !email)
                {
                    return res.status(400).json({ message: 'Name and email are required', data: [] });
                }

                // unique email
                const existing = await User.findOne({ email: email.toLowerCase() });
                if (existing)
                {
                    return res.status(400).json({ message: 'User with this email already exists', data: [] });
                }

                const user = new User({
                    name,
                    email: email.toLowerCase(),
                    pendingTasks: Array.isArray(pendingTasks) ? pendingTasks : [],
                });

                const savedUser = await user.save();

                // if user was created with pendingTasks -> update those tasks
                if (Array.isArray(pendingTasks) && pendingTasks.length > 0)
                {
                    const tasks = await Task.find({ _id: { $in: pendingTasks } });
                    for (const t of tasks)
                    {
                        t.assignedUser = savedUser._id.toString();
                        t.assignedUserName = savedUser.name;
                        await t.save();
                    }
                }

                return res.status(201).json({ message: 'User created', data: savedUser });
            } catch (err)
            {
                return res.status(500).json({ message: 'Server error creating user', data: err.message });
            }
        });

    // /users/:id
    router
        .route('/users/:id')
        .get(async (req, res) =>
        {
            try
            {
                const select = req.query.select ? JSON.parse(req.query.select) : null;
                const user = await User.findById(req.params.id, select || undefined);
                if (!user)
                {
                    return res.status(404).json({ message: 'User not found', data: [] });
                }
                return res.status(200).json({ message: 'OK', data: user });
            } catch (err)
            {
                return res.status(400).json({ message: 'Invalid request', data: [] });
            }
        })
        .put(async (req, res) =>
        {
            try
            {
                const { name, email, pendingTasks } = req.body;
                if (!name || !email)
                {
                    return res.status(400).json({ message: 'Name and email are required', data: [] });
                }

                const user = await User.findById(req.params.id);
                if (!user)
                {
                    return res.status(404).json({ message: 'User not found', data: [] });
                }

                // unique email except self
                const other = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
                if (other)
                {
                    return res.status(400).json({ message: 'Another user with this email already exists', data: [] });
                }

                // unassign old tasks
                if (Array.isArray(user.pendingTasks) && user.pendingTasks.length > 0)
                {
                    const oldTasks = await Task.find({ _id: { $in: user.pendingTasks } });
                    for (const t of oldTasks)
                    {
                        if (t.assignedUser === user._id.toString())
                        {
                            t.assignedUser = '';
                            t.assignedUserName = 'unassigned';
                            await t.save();
                        }
                    }
                }

                // update user
                user.name = name;
                user.email = email.toLowerCase();
                user.pendingTasks = Array.isArray(pendingTasks) ? pendingTasks : [];

                const savedUser = await user.save();

                // assign new tasks
                if (Array.isArray(savedUser.pendingTasks) && savedUser.pendingTasks.length > 0)
                {
                    const newTasks = await Task.find({ _id: { $in: savedUser.pendingTasks } });
                    for (const t of newTasks)
                    {
                        t.assignedUser = savedUser._id.toString();
                        t.assignedUserName = savedUser.name;
                        await t.save();
                    }
                }

                return res.status(200).json({ message: 'User updated', data: savedUser });
            } catch (err)
            {
                return res.status(500).json({ message: 'Server error updating user', data: err.message });
            }
        })
        .delete(async (req, res) =>
        {
            try
            {
                const user = await User.findById(req.params.id);
                if (!user)
                {
                    return res.status(404).json({ message: 'User not found', data: [] });
                }

                // unassign their tasks
                if (Array.isArray(user.pendingTasks) && user.pendingTasks.length > 0)
                {
                    const tasks = await Task.find({ _id: { $in: user.pendingTasks } });
                    for (const t of tasks)
                    {
                        t.assignedUser = '';
                        t.assignedUserName = 'unassigned';
                        await t.save();
                    }
                }

                await user.deleteOne();

                return res.status(200).json({ message: 'User deleted', data: [] });
            } catch (err)
            {
                return res.status(500).json({ message: 'Server error deleting user', data: err.message });
            }
        });

    return router;
};