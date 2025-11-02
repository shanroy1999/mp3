// helper to build mongoose query from req.query
exports.buildQuery = function (model, req)
{
    let query = model.find();

    // where
    if (req.query.where)
    {
        try
        {
            const whereObj = JSON.parse(req.query.where);
            query = query.find(whereObj);
        } catch (e)
        {
            throw new Error('Invalid JSON in "where" parameter');
        }
    }

    // sort
    if (req.query.sort)
    {
        try
        {
            const sortObj = JSON.parse(req.query.sort);
            query = query.sort(sortObj);
        } catch (e)
        {
            throw new Error('Invalid JSON in "sort" parameter');
        }
    }

    // select
    if (req.query.select)
    {
        try
        {
            const selectObj = JSON.parse(req.query.select);
            query = query.select(selectObj);
        } catch (e)
        {
            throw new Error('Invalid JSON in "select" parameter');
        }
    }

    // skip
    if (req.query.skip)
    {
        const skipVal = parseInt(req.query.skip, 10);
        if (!isNaN(skipVal))
        {
            query = query.skip(skipVal);
        }
    }

    // limit
    if (req.query.limit)
    {
        const limitVal = parseInt(req.query.limit, 10);
        if (!isNaN(limitVal))
        {
            query = query.limit(limitVal);
        }
    }

    return query;
};